$ErrorActionPreference = "Stop"

$rpc = "https://rpc-elysium.perpme.fun"
$forge = "C:\Users\user\.foundry\bin\forge.exe"
$cast  = "C:\Users\user\.foundry\bin\cast.exe"

if (-not (Test-Path -LiteralPath $forge)) { throw "forge.exe tidak ditemukan: $forge" }
if (-not (Test-Path -LiteralPath $cast))  { throw "cast.exe tidak ditemukan: $cast" }

$keyFile = Join-Path $PSScriptRoot ".env.deploy.local"
if (-not (Test-Path -LiteralPath $keyFile)) { throw "File .env.deploy.local tidak ditemukan." }
$keyLine = Get-Content -LiteralPath $keyFile | Where-Object { $_ -match '^\s*DEPLOY_PRIVATE_KEY\s*=' } | Select-Object -First 1
$privateKey = ($keyLine -replace '^\s*DEPLOY_PRIVATE_KEY\s*=\s*', '').Trim().Trim('"').Trim("'")
if ([string]::IsNullOrWhiteSpace($privateKey)) {
    throw "DEPLOY_PRIVATE_KEY masih kosong. Isi .env.deploy.local dengan: DEPLOY_PRIVATE_KEY=0x..."
}
if ($privateKey -notmatch '^(0x)?[0-9a-fA-F]{64}$') {
    throw "Format private key tidak valid. Harus 64 karakter hex, opsional diawali 0x."
}
if (-not $privateKey.StartsWith("0x")) { $privateKey = "0x$privateKey" }

try {
    $deployer = (& $cast wallet address --private-key $privateKey).Trim()
    $chain = (& $cast chain-id --rpc-url $rpc).Trim()
    $balance = (& $cast balance $deployer --ether --rpc-url $rpc).Trim()

    Write-Host ""
    Write-Host "Deployer: $deployer"
    Write-Host "Chain ID: $chain"
    Write-Host "Balance: $balance HYPE"

    if ($chain -ne "99901") { throw "RPC bukan Elysium Mainnet (99901)." }

    $env:FEE_ROUTER_ADDRESS = $deployer
    $env:RAQIO_ADMIN_ADDRESS = $deployer

    Write-Host ""
    Write-Host "Menjalankan simulasi deployment..."
    & $forge script script/DeployMainnet.s.sol:DeployMainnet `
        --rpc-url $rpc `
        --chain-id 99901 `
        --private-key $privateKey

    if ($LASTEXITCODE -ne 0) { throw "Simulasi deployment gagal." }

    $confirm = Read-Host "Ketik DEPLOY untuk broadcast mainnet"
    if ($confirm -cne "DEPLOY") {
        Write-Host "Deployment dibatalkan."
        exit 0
    }

    & $forge script script/DeployMainnet.s.sol:DeployMainnet `
        --rpc-url $rpc `
        --chain-id 99901 `
        --private-key $privateKey `
        --broadcast `
        --slow

    if ($LASTEXITCODE -ne 0) { throw "Broadcast deployment gagal." }
    Write-Host "Deployment selesai. Simpan alamat contract dan transaction hash dari output."
}
finally {
    Remove-Variable privateKey -ErrorAction SilentlyContinue
}
