import {describe,it,expect} from 'vitest';
import {buildAllocations,verifyAllocation} from '@/lib/contracts/airdrop-merkle';
import {parseLockId,statusOf,type VaultLock} from '@/lib/contracts/lock-model';
import {isContractConfigured} from '@/lib/contracts/config';
const alice='0x1111111111111111111111111111111111111111';const bob='0x2222222222222222222222222222222222222222';const carol='0x3333333333333333333333333333333333333333';
describe('airdrop allocations',()=>{
 it('verifies every allocation in an odd-sized tree and rejects another wallet or amount',()=>{const tree=buildAllocations(JSON.stringify([{address:alice,amount:'1234567'},{address:bob,amount:'1'},{address:carol,amount:'900719925474099300000'}]));expect(tree.total).toBe(900719925474100534568n);for(const row of tree.allocations){expect(verifyAllocation(row.address,BigInt(row.amount),row.proof,tree.root)).toBe(true);expect(verifyAllocation(row.address,BigInt(row.amount)+1n,row.proof,tree.root)).toBe(false);}expect(verifyAllocation(bob,1234567n,tree.allocations[0].proof,tree.root)).toBe(false);});
 it('supports a one-recipient campaign with an empty proof',()=>{const tree=buildAllocations(JSON.stringify([{address:alice,amount:'1'}]));expect(tree.allocations[0].proof).toEqual([]);expect(verifyAllocation(alice,1n,[],tree.root)).toBe(true);});
 it('rejects duplicate wallets, floats, zero and uint256 overflow',()=>{expect(()=>buildAllocations(JSON.stringify([{address:alice,amount:'1'},{address:alice.toUpperCase().replace('0X','0x'),amount:'2'}]))).toThrow(/Duplicate/);for(const amount of ['0','1.5','1e18',(2n**256n).toString()])expect(()=>buildAllocations(JSON.stringify([{address:alice,amount}]))).toThrow();});
});
describe('lock identity and lifecycle',()=>{
 it('accepts lock zero, rejects decimal/negative/search noise and uint256 overflow',()=>{expect(parseLockId('0')).toBe(0n);for(const text of ['1.5','-1','0x1','', (2n**256n).toString()])expect(parseLockId(text)).toBeUndefined();});
 it('distinguishes scheduled, cliff, streaming and terminal states',()=>{const l:VaultLock={id:0n,lockType:3,owner:alice,beneficiary:bob,token:carol,tokenId:0n,amount:100n,startTime:100n,cliffTime:200n,endTime:300n,claimed:0n,cancelable:true,canceled:false,withdrawn:false};expect(statusOf(l,99n)).toBe('Scheduled');expect(statusOf(l,150n)).toBe('Cliff period');expect(statusOf(l,201n)).toBe('Streaming');expect(statusOf(l,300n)).toBe('Fully vested');expect(statusOf({...l,canceled:true},400n)).toBe('Canceled');expect(statusOf({...l,withdrawn:true},400n)).toBe('Withdrawn');});
 it('does not treat missing or zero deployment addresses as configured',()=>{expect(isContractConfigured('0x')).toBe(false);expect(isContractConfigured('0x0000000000000000000000000000000000000000')).toBe(false);expect(isContractConfigured(alice)).toBe(true);});
});
