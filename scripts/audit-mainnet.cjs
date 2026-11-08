const fs = require('node:fs');
const { createPublicClient, http, parseAbi } = require('viem');
const deployment = JSON.parse(fs.readFileSync('contracts/deployments/elysium-mainnet-99901.json', 'utf8'));
const abi = parseAbi(['function owner() view returns (address)', 'function pendingOwner() view returns (address)', 'function feeBps() view returns (uint256)', 'function feeRouter() view returns (address)', 'function vault() view returns (address)']);
const client = createPublicClient({ transport: http(deployment.rpcUrl, { timeout: 15000, retryCount: 1 }) });
(async () => {
  const report = { checkedAt: new Date().toISOString(), chainId: await client.getChainId(), contracts: [], receipts: [], files: [] };
  if (report.chainId !== deployment.chainId) throw new Error('RPC chain mismatch');
  for (const [name, address] of Object.entries(deployment.contracts)) {
    const artifact = JSON.parse(fs.readFileSync(`contracts/out/${name}.sol/${name}.json`, 'utf8'));
    const code = await client.getCode({ address });
    let actual = (code || '0x').slice(2).toLowerCase();
    let expected = artifact.deployedBytecode.object.replace(/^0x/, '').toLowerCase();
    for (const refs of Object.values(artifact.deployedBytecode.immutableReferences || {})) for (const { start, length } of refs) {
      actual = actual.slice(0, start * 2) + '0'.repeat(length * 2) + actual.slice((start + length) * 2);
      expected = expected.slice(0, start * 2) + '0'.repeat(length * 2) + expected.slice((start + length) * 2);
    }
    const owner = await client.readContract({ address, abi, functionName: 'owner' });
    const pendingOwner = await client.readContract({ address, abi, functionName: 'pendingOwner' });
    const state = name === 'RaqioVault' ? { feeBps: String(await client.readContract({ address, abi, functionName: 'feeBps' })), feeRecipient: await client.readContract({ address, abi, functionName: 'feeRouter' }) } : { vault: await client.readContract({ address, abi, functionName: 'vault' }) };
    const publicAbi = JSON.parse(fs.readFileSync(`public/contracts/${name}.abi.json`, 'utf8'));
    report.contracts.push({ name, address, codeBytes: (code.length - 2) / 2, runtimeMatchesArtifact: actual === expected, abiMatchesArtifact: JSON.stringify(publicAbi) === JSON.stringify(artifact.abi), owner, pendingOwner, ...state });
  }
  for (const hash of deployment.transactions) {
    const receipt = await client.getTransactionReceipt({ hash });
    report.receipts.push({ hash, status: receipt.status, block: String(receipt.blockNumber), contractAddress: receipt.contractAddress, to: receipt.to });
  }
  report.files.push({ name: 'public deployment record', matchesSource: fs.readFileSync('public/contracts/elysium-mainnet-99901.json', 'utf8') === fs.readFileSync('contracts/deployments/elysium-mainnet-99901.json', 'utf8') });
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/mainnet-audit.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.contracts.some(c => !c.runtimeMatchesArtifact || !c.abiMatchesArtifact) || report.receipts.some(r => r.status !== 'success') || report.files.some(f => !f.matchesSource)) process.exitCode = 1;
})().catch(error => { console.error(error.shortMessage || error.message); process.exitCode = 1; });
