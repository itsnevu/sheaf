export const LOCK_TYPES=['Token lock','LP lock','Linear stream','Cliff stream'] as const;
export interface VaultLock {id:bigint;lockType:number;owner:`0x${string}`;beneficiary:`0x${string}`;token:`0x${string}`;tokenId:bigint;amount:bigint;startTime:bigint;cliffTime:bigint;endTime:bigint;claimed:bigint;cancelable:boolean;canceled:boolean;withdrawn:boolean;}
export function statusOf(lock:VaultLock,now:bigint){
 if(lock.canceled)return 'Canceled';if(lock.withdrawn)return 'Withdrawn';
 if(now>=lock.endTime)return lock.lockType>=2?'Fully vested':'Unlocked';
 if(lock.lockType>=2)return now<lock.startTime?'Scheduled':now<lock.cliffTime?'Cliff period':'Streaming';
 return 'Locked';
}
export function parseLockId(value:string):bigint|undefined {if(!/^\d+$/.test(value)||value.length>78)return undefined;const id=BigInt(value);return id<2n**256n?id:undefined;}
