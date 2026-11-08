"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useReadContract} from "wagmi";
import {erc20Abi,formatUnits,isAddress,type Address} from "viem";
import {CONTRACTS,elysiumTestnet,isContractConfigured} from "@/lib/contracts/config";
import {RAQIO_VAULT_ABI} from "@/lib/contracts/vault-abi";
import {useChainTime} from '@/lib/contracts/use-chain-time';
import {LOCK_TYPES,parseLockId,statusOf} from "@/lib/contracts/lock-model";
type SearchActivity={address:Address;searches:number};
function RecentToken({address,searches,onSelect}:{address:Address;searches:number;onSelect:(address:string)=>void}){
 const records=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'tokenLockCount',args:[address],chainId:elysiumTestnet.id,query:{refetchInterval:15000}});
 const symbol=useReadContract({address,abi:erc20Abi,functionName:'symbol',chainId:elysiumTestnet.id});
 if(!records.data||records.error)return null;
 return <button type="button" className="recent-token" onClick={()=>onSelect(address)} title={address}><strong>{symbol.data||'Token'}</strong><span>{address.slice(0,6)}…{address.slice(-4)}</span><small>{searches} {searches===1?'search':'searches'} · {records.data.toString()} locks</small></button>;
}
function LockRow({id,now}:{id:bigint;now:bigint}){
 const lock=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'getLock',args:[id],chainId:elysiumTestnet.id});
 const l=lock.data;
 const nft=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'isNFTLock',args:[id],chainId:elysiumTestnet.id});
 const symbol=useReadContract({address:l?.token,abi:erc20Abi,functionName:'symbol',chainId:elysiumTestnet.id,query:{enabled:!!l&&!nft.data}});
 const decimals=useReadContract({address:l?.token,abi:erc20Abi,functionName:'decimals',chainId:elysiumTestnet.id,query:{enabled:!!l&&!nft.data}});
 if(lock.error)return <tr><td colSpan={7}>Could not load lock #{id.toString()}. Refresh to retry.</td></tr>;
 if(!l)return <tr><td colSpan={7}>Loading lock #{id.toString()}…</td></tr>;
 return <tr><td><Link href={`/explore/${id}`} className="link">#{id.toString()}</Link></td><td>{LOCK_TYPES[l.lockType]}</td><td><span>{symbol.data||l.token.slice(0,10)+'…'}</span><small className="block">{l.token.slice(0,8)}…{l.token.slice(-6)}</small></td><td className="font-mono">{nft.data?`NFT #${l.tokenId}`:decimals.data===undefined?'Metadata unavailable':formatUnits(l.amount,decimals.data)}</td><td>{new Date(Number(l.endTime)*1000).toLocaleDateString('en-GB')}</td><td>{statusOf(l,now)}</td><td className="font-mono">{l.owner.slice(0,8)}…{l.owner.slice(-4)}</td></tr>;
}
export default function LockExplorer(){
 const [recent,setRecent]=useState<SearchActivity[]>([]);const [activityError,setActivityError]=useState(false);const recorded=useRef('');
 useEffect(()=>{let active=true;async function refresh(){try{const response=await fetch('/api/explore/searches',{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(active){setRecent(data.tokens);setActivityError(false);}}catch{if(active)setActivityError(true);}}void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>{active=false;clearInterval(timer);};},[]);
 const configured=isContractConfigured(CONTRACTS.raqioVault);const [search,setSearch]=useState('');const [page,setPage]=useState(0);const now=useChainTime(configured);
 const total=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'nextLockId',chainId:elysiumTestnet.id,query:{enabled:configured,refetchInterval:15000}});
 const address=isAddress(search,{strict:false})?search as Address:undefined;
 const owner=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'locksOf',args:address?[address]:undefined,chainId:elysiumTestnet.id,query:{enabled:configured&&!!address}});
 const token=useReadContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'locksForToken',args:address?[address]:undefined,chainId:elysiumTestnet.id,query:{enabled:configured&&!!address}});
 useEffect(()=>{
  if(!address){recorded.current='';return;}
  if(!configured||token.isFetching||token.error||!token.data?.length||recorded.current===address.toLowerCase())return;
  const normalized=address.toLowerCase();
  const timer=setTimeout(()=>{recorded.current=normalized;void fetch('/api/explore/searches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:normalized})}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();setRecent(data.tokens);setActivityError(false);}).catch(()=>{recorded.current='';setActivityError(true);});},700);
  return()=>clearTimeout(timer);
 },[address,configured,token.data,token.error,token.isFetching]);
 const id=parseLockId(search.replace(/^#/,''));const filtering=!!search;const validSearch=!filtering||address||id!==undefined;
 const matches=address?[...new Set([...(owner.data??[]),...(token.data??[])].map(String))].map(BigInt).sort((a,b)=>a>b?-1:1):id!==undefined&&total.data!==undefined&&id<total.data?[id]:[];
 const count=filtering?BigInt(matches.length):total.data??0n;const pages=(count+19n)/20n;const safePage=pages>0n&&BigInt(page)>=pages?0:page;
 const ids=filtering?matches.slice(safePage*20,safePage*20+20):Array.from({length:Number(count-BigInt(safePage*20)>20n?20n:count-BigInt(safePage*20)>0n?count-BigInt(safePage*20):0n)},(_,i)=>count-1n-BigInt(safePage*20+i));
 const loading=total.isLoading||(!!address&&(owner.isLoading||token.isLoading));const error=total.error||owner.error||token.error;
 return <div className="lock-explorer"><div className="flex flex-wrap gap-6 items-end justify-between"><div><h1 className="title-1">Explore locks</h1><p className="lede mt-4">Read public vault records directly from Elysium Testnet.</p></div><Link href="/app/lock" className="btn btn-primary">Create a lock ↗</Link></div>
 <label className="label mt-8">Find a lock<input className="input mt-2" placeholder="Lock ID, token contract or wallet address" value={search} onChange={e=>{setSearch(e.target.value.trim());setPage(0);}}/></label>
 {configured&&<section className="recent-searches" aria-label="Public recent token searches"><div className="recent-searches-heading"><p>Recently searched</p><span className="help">Community activity</span></div><div className="recent-token-list">{recent.map(item=><RecentToken key={item.address} {...item} onSelect={value=>{setSearch(value);setPage(0);}}/>)}</div>{activityError?<p className="help" role="status">Search activity is temporarily unavailable.</p>:recent.length===0?<p className="help">No verified token searches yet.</p>:null}<p className="help">Public searches for tokens with recorded Raqio locks. Repeat searches from the same browser count once per token per hour.</p></section>}
 {!configured?<p className="inset p-6 mt-6" role="status">RaqioVault has not been configured on this instance. No on-chain statistics are available yet.</p>:<><div className="flex gap-8 my-6"><p>Total locks: {total.data?.toString()??'—'}</p><p>Matching records: {count.toString()}</p></div><p className="help">Dollar TVL is not shown because a verified price feed is not configured. Token amounts use each token&apos;s on-chain decimals.</p>
 {!validSearch?<p role="status" className="mt-6">Enter an integer lock ID or a complete wallet/token address.</p>:error?<div role="alert" className="inset p-6 mt-6"><p>Could not read the vault. Check the configured contract and RPC connection.</p><button type="button" className="link" onClick={()=>{void total.refetch();if(address){void owner.refetch();void token.refetch();}}}>Retry</button></div>:loading?<p role="status" className="mt-6">Reading vault records…</p>:ids.length===0?<p role="status" className="inset p-6 mt-6">No matching locks found.</p>:<><div className="table-wrap mt-6"><table className="table"><thead><tr>{['ID','Type','Token','Amount','Unlock date','Status','Owner'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{ids.map(id=><LockRow id={id} key={id.toString()} now={now}/>)}</tbody></table></div><nav aria-label="Lock result pages" className="button-row"><button className="btn btn-secondary" disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Previous</button><span className="self-center">Page {safePage+1} of {pages.toString()}</span><button className="btn btn-secondary" disabled={BigInt(safePage+1)>=pages} onClick={()=>setPage(safePage+1)}>Next</button></nav></>}
 </>}
 </div>;
}
