import {encodeAbiParameters,keccak256,concat,isAddress,zeroAddress,type Address,type Hex} from "viem";
export interface Allocation {address:Address;amount:bigint;}
export function allocationLeaf(address:Address,amount:bigint):Hex{return keccak256(keccak256(encodeAbiParameters([{type:'address'},{type:'uint256'}],[address,amount])));}
function pair(a:Hex,b:Hex):Hex{return keccak256(concat(a.toLowerCase()<b.toLowerCase()?[a,b]:[b,a]));}
export function verifyAllocation(address:Address,amount:bigint,proof:Hex[],root:Hex){return proof.reduce((node,sibling)=>pair(node,sibling),allocationLeaf(address,amount)).toLowerCase()===root.toLowerCase();}
export function buildAllocations(input:string){
 const parsed:unknown=JSON.parse(input);if(!Array.isArray(parsed)||parsed.length===0||parsed.length>10000)throw new Error('Provide 1 to 10,000 allocations.');
 const seen=new Set<string>();const entries:Allocation[]=parsed.map((row:unknown)=>{if(!row||typeof row!=='object')throw new Error('Each allocation needs address and amount.');const r=row as Record<string,unknown>;if(typeof r.address!=='string'||!isAddress(r.address,{strict:false})||r.address.toLowerCase()===zeroAddress)throw new Error('Invalid recipient address.');if(typeof r.amount!=='string'||!/^\d+$/.test(r.amount)||r.amount.length>78)throw new Error('Amounts must be integer base-unit strings.');const amount=BigInt(r.amount);if(amount<=0n||amount>=2n**256n)throw new Error('Allocation is outside uint256 range.');if(seen.has(r.address.toLowerCase()))throw new Error('Duplicate recipient: '+r.address);seen.add(r.address.toLowerCase());return {address:r.address as Address,amount};});
 let total=0n;for(const e of entries)total+=e.amount;if(total>=2n**256n)throw new Error('Total allocation exceeds uint256.');
 const layers:Hex[][]=[entries.map(e=>allocationLeaf(e.address,e.amount))];while(layers[layers.length-1].length>1){const last=layers[layers.length-1];const next:Hex[]=[];for(let i=0;i<last.length;i+=2)next.push(i+1<last.length?pair(last[i],last[i+1]):last[i]);layers.push(next);}
 const allocations=entries.map((entry,index)=>{const proof:Hex[]=[];let position=index;for(let level=0;level<layers.length-1;level++){const sibling=position^1;if(sibling<layers[level].length)proof.push(layers[level][sibling]);position=Math.floor(position/2);}return{address:entry.address,amount:entry.amount.toString(),proof};});
 return{root:layers[layers.length-1][0],total,allocations};
}
