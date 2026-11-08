"use client";
import {useState} from "react";
import {useReadContract} from "wagmi";
import {isAddress,type Address} from "viem";
import {CONTRACTS,elysiumMainnet,isContractConfigured} from "@/lib/contracts/config";
import {RAQIO_SCORE_ABI} from "@/lib/contracts/score-abi";

export default function TrustScore({score,breakdown}:{score?:number;breakdown?:{supplyLocked:number;lpLocked:number;vestingActive:number;history:number}}={}){
 const [token,setToken]=useState('');const valid=isAddress(token,{strict:false});const configured=isContractConfigured(CONTRACTS.raqioScore);
 const result=useReadContract({address:CONTRACTS.raqioScore,abi:RAQIO_SCORE_ABI,functionName:'getFullScore',args:valid?[token as Address]:undefined,chainId:elysiumMainnet.id,query:{enabled:score===undefined&&configured&&valid,refetchInterval:15000}});
 const current=score??result.data?.value;const value=current===undefined?undefined:Math.max(0,Math.min(100,current));
 const facts=breakdown??(result.data?{supplyLocked:result.data.supplyLocked,lpLocked:result.data.lpLocked,vestingActive:result.data.vestingUsage,history:result.data.history}:undefined);
 const color=value===undefined?'var(--line)':value<=30?'var(--danger)':value<=60?'var(--sky)':'var(--success)';const circumference=2*Math.PI*82;
 return <div className="trust-score-demo"><div className="trust-gauge"><svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label={value===undefined?'No token score loaded':`On-chain commitment score ${value} out of 100`}><circle cx="100" cy="100" r="82" fill="none" stroke="var(--line)" strokeWidth="6"/><circle cx="100" cy="100" r="82" fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={circumference*(1-(value??0)/100)} transform="rotate(-90 100 100)"/><text x="100" y="100" textAnchor="middle" fill="var(--fg)" fontSize="56" fontFamily="var(--font-display)">{value??'—'}</text><text x="100" y="125" textAnchor="middle" fill="var(--fg-2)" fontSize="10" fontFamily="var(--font-mono)">OUT OF 100</text></svg></div>
 {score===undefined&&<label className="label mt-6">Token contract<input className="input mt-2" value={token} onChange={e=>setToken(e.target.value.trim())} placeholder="0x…"/></label>}
 {!configured&&score===undefined&&<p className="help">Score contract not configured. No score is being shown.</p>}{result.isFetching&&<p role="status" className="help">Computing from vault records…</p>}{result.error&&<p role="alert" className="help">Score unavailable. Check the token/score contracts and RPC. The scorer refuses incomplete results above its 256-lock limit.</p>}
 {facts&&<dl className="trust-breakdown">{[['Supply locked',facts.supplyLocked],['Registered LP locked',facts.lpLocked],['Active vesting',facts.vestingActive],['History component',facts.history]].map(([label,pct])=><div className="trust-bar-row" key={label}><dt>{label}</dt><dd>{pct}%</dd></div>)}</dl>}
 <p className="help mt-4">A commitment indicator computed from vault records, not a security audit or a guarantee against fraud. LP associations are registered by the score-contract owner. Arbitrary NFTs are excluded.</p></div>;
}
