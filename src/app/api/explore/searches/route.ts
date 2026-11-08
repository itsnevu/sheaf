import {randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {createPublicClient,http,isAddress} from 'viem';
import {db} from '@/lib/db';
import {CONTRACTS,elysiumTestnet,isContractConfigured} from '@/lib/contracts/config';
import {RAQIO_VAULT_ABI} from '@/lib/contracts/vault-abi';

export const dynamic='force-dynamic';
const scope=`${elysiumTestnet.id}:${CONTRACTS.raqioVault.toLowerCase()}`;
const client=createPublicClient({chain:elysiumTestnet,transport:http(undefined,{timeout:8000,retryCount:0})});
async function results(){
 const rows=await db.$queryRaw<{token:string; searches:bigint; lastSearched:bigint}[]>`
 SELECT token, COUNT(*) AS searches, MAX(searchedAt) AS lastSearched
 FROM PublicTokenSearch WHERE scope=${scope} GROUP BY token ORDER BY lastSearched DESC LIMIT 8`;
 return rows.map(row=>({address:row.token,searches:Number(row.searches),lastSearched:Number(row.lastSearched)}));
}
export async function GET(){
 try{return Response.json({tokens:isContractConfigured(CONTRACTS.raqioVault)?await results():[]});}
 catch{return Response.json({error:'Search activity is temporarily unavailable.'},{status:503});}
}
export async function POST(request:Request){
 if(!isContractConfigured(CONTRACTS.raqioVault))return Response.json({error:'Vault unavailable.'},{status:503});
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 let address:unknown;
 try{const body=await request.text();if(body.length>256)return Response.json({error:'Invalid search.'},{status:400});address=JSON.parse(body).address;}catch{return Response.json({error:'Invalid search.'},{status:400});}
 if(typeof address!=='string'||!isAddress(address,{strict:false}))return Response.json({error:'Invalid token address.'},{status:400});
 try{
  const count=await client.readContract({address:CONTRACTS.raqioVault,abi:RAQIO_VAULT_ABI,functionName:'tokenLockCount',args:[address]});
  if(count===0n)return Response.json({error:'Token has no recorded locks.'},{status:422});
  const jar=cookies();const existing=jar.get('raqio-search-visitor')?.value;
  const visitor=existing&&/^[0-9a-f-]{36}$/.test(existing)?existing:randomUUID();
  const now=Date.now();const bucket=Math.floor(now/3600000);const token=address.toLowerCase();
  await db.$executeRaw`INSERT INTO PublicTokenSearch (scope,token,visitor,bucket,searchedAt) VALUES (${scope},${token},${visitor},${bucket},${now}) ON CONFLICT(scope,token,visitor,bucket) DO NOTHING`;
  const response=Response.json({tokens:await results()});
  response.headers.append('Set-Cookie',`raqio-search-visitor=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return response;
 }catch{return Response.json({error:'Could not verify or record this search.'},{status:503});}
}
