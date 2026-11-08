import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),write:vi.fn(),query:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{$executeRaw:mocks.write,$queryRaw:mocks.query}}));
vi.mock('next/headers',()=>({cookies:()=>({get:()=>undefined})}));
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createPublicClient:()=>({readContract:mocks.read})}));
vi.mock('@/lib/contracts/config',()=>({CONTRACTS:{raqioVault:'0x1111111111111111111111111111111111111111'},elysiumTestnet:{id:99801},isContractConfigured:()=>true}));
import {GET,POST} from '@/app/api/explore/searches/route';
const address='0x2222222222222222222222222222222222222222';
const request=(value:string)=>new Request('http://localhost/api/explore/searches',{method:'POST',headers:{origin:'http://localhost'},body:JSON.stringify({address:value})});
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockResolvedValue([{token:address,searches:3n,lastSearched:100n}]);mocks.read.mockResolvedValue(1n);mocks.write.mockResolvedValue(1);});
describe('public token search activity',()=>{
 it('rejects malformed addresses and tokens without vault records before writing',async()=>{expect((await POST(request('garbage'))).status).toBe(400);mocks.read.mockResolvedValue(0n);expect((await POST(request(address))).status).toBe(422);expect(mocks.write).not.toHaveBeenCalled();});
 it('only records verified searches and returns shared counts with an anonymous cookie',async()=>{const response=await POST(request(address));expect(response.status).toBe(200);expect(mocks.read).toHaveBeenCalled();expect(mocks.write).toHaveBeenCalledOnce();expect(response.headers.get('set-cookie')).toContain('HttpOnly');expect((await response.json()).tokens[0].searches).toBe(3);expect((await (await GET()).json()).tokens[0].address).toBe(address);});
 it('does not record searches when RPC validation fails',async()=>{mocks.read.mockRejectedValue(new Error('RPC unavailable'));expect((await POST(request(address))).status).toBe(503);expect(mocks.write).not.toHaveBeenCalled();});
});
