"use client";
import {useState} from "react";
import Link from "next/link";
import {useAccount,usePublicClient,useReadContract,useWriteContract} from "wagmi";
import {erc20Abi,erc721Abi,decodeEventLog,formatUnits,isAddress,parseUnits,zeroAddress,type Address,type Hash} from "viem";
import {CONTRACTS,elysiumMainnet,isContractConfigured} from "@/lib/contracts/config";
import {RAQIO_VAULT_ABI} from "@/lib/contracts/vault-abi";
import WalletConnection from "./WalletConnection";

export type VaultKind='tokens'|'lp'|'nft'|'stream';
function parseAmount(input:string,decimals:number|undefined){try{if(decimals===undefined||!/^\d+(\.\d+)?$/.test(input)||((input.split('.')[1]?.length??0)>decimals))return 0n;return parseUnits(input,decimals);}catch{return 0n;}}
export default function VaultForm({kind}:{kind:VaultKind}){
 const account=useAccount();const client=usePublicClient({chainId:elysiumMainnet.id});const write=useWriteContract();
 const [tokenInput,setToken]=useState('');const [amount,setAmount]=useState('');const [date,setDate]=useState('');const [beneficiary,setBeneficiary]=useState('');const [tokenId,setTokenId]=useState('0');const [duration,setDuration]=useState('180');const [cliff,setCliff]=useState('0');const [cancelable,setCancelable]=useState(false);
 const [busy,setBusy]=useState(false);const [stage,setStage]=useState('');const [error,setError]=useState('');const [success,setSuccess]=useState<{id:bigint;hash:Hash}|null>(null);
 const nft=kind==='nft';const stream=kind==='stream';const configured=isContractConfigured(CONTRACTS.raqioVault);const token=isAddress(tokenInput,{strict:false})&&tokenInput.toLowerCase()!==zeroAddress?tokenInput as Address:undefined;
 const decimals=useReadContract({address:token,abi:erc20Abi,functionName:'decimals',chainId:elysiumMainnet.id,query:{enabled:!!token&&!nft}});
 const symbol=useReadContract({address:token,abi:erc20Abi,functionName:'symbol',chainId:elysiumMainnet.id,query:{enabled:!!token&&!nft}});
 const balance=useReadContract({address:token,abi:erc20Abi,functionName:'balanceOf',args:account.address?[account.address]:undefined,chainId:elysiumMainnet.id,query:{enabled:!!token&&!!account.address&&!nft}});
 const fee=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'feeBps',chainId:elysiumMainnet.id,query:{enabled:configured}});
 const value=parseAmount(amount,decimals.data);const recipient=beneficiary.trim()||account.address||'';const validRecipient=isAddress(recipient,{strict:false})&&recipient.toLowerCase()!==zeroAddress;
 const dateMs=date?new Date(date).getTime():NaN;const durationDays=Number(duration);const cliffDays=Number(cliff);
 const validTime=stream?Number.isSafeInteger(durationDays)&&durationDays>0&&durationDays<=36500&&Number.isSafeInteger(cliffDays)&&cliffDays>=0&&cliffDays<=durationDays:Number.isFinite(dateMs)&&dateMs>=Date.now()+86400000;
 const validValue=nft?/^\d+$/.test(tokenId):value>0n&&balance.data!==undefined&&value<=balance.data&&fee.data!==undefined;
 const ready=configured&&!!token&&validRecipient&&validTime&&validValue&&account.chainId===elysiumMainnet.id&&!busy;
 const title=nft?'Lock an NFT position':kind==='lp'?'Lock LP tokens':stream?'Create a vault stream':'Lock tokens';
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!ready||!client||!token||!account.address)return;setBusy(true);setError('');setSuccess(null);
  try{
   const sender=account.address;const receiver=recipient as Address;
   if(nft){setStage('Approve NFT position in your wallet');const approved=await client.readContract({address:token,abi:erc721Abi,functionName:'getApproved',args:[BigInt(tokenId)]});const all=await client.readContract({address:token,abi:erc721Abi,functionName:'isApprovedForAll',args:[sender,CONTRACTS.raqioVault]});if(!all&&approved.toLowerCase()!==CONTRACTS.raqioVault.toLowerCase()){const h=await write.writeContractAsync({address:token,abi:erc721Abi,functionName:'approve',args:[CONTRACTS.raqioVault,BigInt(tokenId)],chainId:elysiumMainnet.id});const r=await client.waitForTransactionReceipt({hash:h});if(r.status!=='success')throw new Error('NFT approval reverted.');}}
   else {const allowance=await client.readContract({address:token,abi:erc20Abi,functionName:'allowance',args:[sender,CONTRACTS.raqioVault]});if(allowance<value){const approvals=allowance>0n?[0n,value]:[value];for(const limit of approvals){setStage(limit===0n?'Reset token allowance':'Approve deposit in your wallet');const h=await write.writeContractAsync({address:token,abi:erc20Abi,functionName:'approve',args:[CONTRACTS.raqioVault,limit],chainId:elysiumMainnet.id});setStage('Waiting for approval confirmation');const r=await client.waitForTransactionReceipt({hash:h});if(r.status!=='success')throw new Error('Token approval reverted.');}}}
   setStage('Confirm vault transaction in your wallet');
   const common={address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,account:sender} as const;
   let hash:Hash;
   if(nft){const {request}=await client.simulateContract({...common,functionName:'lockNFTPosition',args:[token,BigInt(tokenId),BigInt(Math.floor(dateMs/1000)),receiver]});hash=await write.writeContractAsync({...request,chainId:elysiumMainnet.id});}
   else if(stream){const {request}=await client.simulateContract({...common,functionName:'createStream',args:[receiver,token,value,BigInt(Math.floor(Date.now()/1000)),BigInt(cliffDays*86400),BigInt(durationDays*86400),cancelable]});hash=await write.writeContractAsync({...request,chainId:elysiumMainnet.id});}
   else{const {request}=await client.simulateContract({...common,functionName:kind==='lp'?'lockLP':'lockTokens',args:[token,value,BigInt(Math.floor(dateMs/1000)),receiver]});hash=await write.writeContractAsync({...request,chainId:elysiumMainnet.id});}
   setStage('Waiting for vault confirmation');const receipt=await client.waitForTransactionReceipt({hash});if(receipt.status!=='success')throw new Error('Vault transaction reverted.');
   let id:bigint|undefined;for(const log of receipt.logs){if(log.address.toLowerCase()!==CONTRACTS.raqioVault.toLowerCase())continue;try{const event=decodeEventLog({abi:RAQIO_VAULT_ABI,data:log.data,topics:log.topics});if('lockId' in event.args)id=event.args.lockId;}catch{}}
   if(id===undefined)throw new Error('Transaction confirmed, but a lock event was not found. Check the transaction in the explorer.');setSuccess({id,hash});void balance.refetch();
  }catch(err){setError(err instanceof Error?err.message.split('\n')[0]:'Transaction failed.');}finally{setBusy(false);setStage('');}
 };
 return <div className="vault-form"><Link href="/app/lock" className="link">← All lock types</Link><h1 className="title-1 mt-6">{title}</h1><p className="lede mt-4">{stream?'A linear schedule, with an optional cliff.':'Tokens remain in the vault until the selected time.'} Elysium Mainnet transactions use real assets.</p><WalletConnection/>
 {!configured&&<p role="status" className="inset p-4 my-6">The RaqioVault address has not been configured for Elysium Mainnet. Transactions are unavailable.</p>}
 <p className="help">Use standard, non-rebasing tokens. Transfer-tax deposits are rejected. <Link className="link" href="/docs/vault">Read the vault rules.</Link></p>
 {success?<section className="card p-6 mt-6" role="status"><h2 className="title-2">Lock #{success.id.toString()} confirmed</h2><div className="button-row"><Link className="btn btn-primary" href={`/explore/${success.id}`}>View public proof</Link><a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`${elysiumMainnet.blockExplorers.default.url}/tx/${success.hash}`}>View transaction ↗</a></div><button className="link mt-6" type="button" onClick={()=>setSuccess(null)}>Create another</button></section>:<form onSubmit={submit} className="space-y-5 mt-6"><fieldset disabled={busy} className="space-y-5">
 <label className="label">{nft?'Position NFT contract':'Token contract'}<input className="input mt-2" value={tokenInput} onChange={e=>setToken(e.target.value.trim())} placeholder="0x…" required/></label>
 {token&&!nft&&<p className="help">{symbol.data??'Reading token…'}{balance.data!==undefined&&decimals.data!==undefined?` · Balance: ${formatUnits(balance.data,decimals.data)}`:''}{decimals.error?' · Could not read token metadata.':''}</p>}
 {nft?<label className="label">Position token ID<input className="input mt-2" inputMode="numeric" value={tokenId} onChange={e=>setTokenId(e.target.value)} required/></label>:<div><label className="label">Amount<input className="input mt-2" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><button type="button" className="link micro" disabled={balance.data===undefined||decimals.data===undefined} onClick={()=>balance.data!==undefined&&decimals.data!==undefined&&setAmount(formatUnits(balance.data,decimals.data))}>Use maximum balance</button></div>}
 {stream?<><label className="label">Vesting duration (days)<input className="input mt-2" type="number" min="1" max="36500" step="1" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label className="label">Cliff (days)<input className="input mt-2" type="number" min="0" max={durationDays||0} step="1" value={cliff} onChange={e=>setCliff(e.target.value)}/></label><label className="flex gap-3"><input type="checkbox" checked={cancelable} onChange={e=>setCancelable(e.target.checked)}/>Allow the sender to cancel unvested tokens</label></>:<label className="label">Unlock date and time<input className="input mt-2" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required/><span className="help block">At least 24 hours from now. Uses your local timezone.</span></label>}
 <label className="label">Beneficiary<input className="input mt-2" value={beneficiary} onChange={e=>setBeneficiary(e.target.value.trim())} placeholder={account.address||'Connected wallet by default'}/></label>
 {!nft&&fee.data!==undefined&&decimals.data!==undefined&&<div className="inset p-4"><p>Protocol fee: {fee.data.toString()} bps</p><p>Net locked: {formatUnits(value-value*fee.data/10000n,decimals.data)} {symbol.data}</p></div>}
 {nft&&<p className="help">This locks an ERC-721 token. Pool identity, liquidity amounts, fee collection and Uniswap V4 hooks are not verified by the vault.</p>}
 <button type="submit" className="btn btn-primary w-full" disabled={!ready}>{busy?stage:'Approve & confirm '+(stream?'stream':'lock')}</button></fieldset>{busy&&<p role="status">{stage}</p>}{error&&<p role="alert" className="error-text">{error}</p>}</form>}
 </div>;
}
