import {describe,it,expect,vi} from 'vitest';
import {db} from '@/lib/db';
import {createBatch,importCsv} from '@/lib/services/batches';
import {quoteRecipient} from '@/lib/worker/handlers';
import {KNOWN_ASSETS} from '@/lib/config';
import {makeOrg,csvOf,ADDR} from './helpers';
describe('Elysium route configuration',()=>{
 it('does not quote an unconfigured ERC-20 as native HYPE in real mode',async()=>{
  const ctx=await makeOrg();const b=await createBatch(ctx.finance,{name:'Missing token configuration'});await importCsv(ctx.finance,b.id,{fileName:'legs.csv',text:csvOf([{name:'Recipient',address:ADDR(7),amount:'10'}])});const batch=await db.paymentBatch.update({where:{id:b.id},data:{mode:'real'}});const recipient=await db.batchRecipient.findFirstOrThrow({where:{batchId:b.id}});
  const old=KNOWN_ASSETS[99901].USDG.address;KNOWN_ASSETS[99901].USDG.address='0x'+'0'.repeat(40);const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network should not be used'));
  try{expect(await quoteRecipient(batch,recipient)).toBe(false);expect(fetch).not.toHaveBeenCalled();const route=await db.paymentRoute.findUniqueOrThrow({where:{recipientId:recipient.id}});expect(route.status).toBe('UNAVAILABLE');expect(route.error).toContain('ASSET_NOT_CONFIGURED');}finally{KNOWN_ASSETS[99901].USDG.address=old;fetch.mockRestore();}
 });
});
