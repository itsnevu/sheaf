"use client";
import {useAccount,useConnect,useSwitchChain} from "wagmi";
import {elysiumTestnet} from "@/lib/contracts/config";
export default function WalletConnection(){
 const account=useAccount();const connect=useConnect();const network=useSwitchChain();
 return <div className="wallet-connection"><p className="micro">Elysium Testnet · Chain {elysiumTestnet.id}</p>{!account.address?<button className="btn btn-secondary" type="button" disabled={!connect.connectors[0]||connect.isPending} onClick={()=>connect.connect({connector:connect.connectors[0],chainId:elysiumTestnet.id})}>{connect.isPending?'Connecting…':'Connect wallet'}</button>:<><p className="mono-data">{account.address.slice(0,8)}…{account.address.slice(-6)}</p>{account.chainId!==elysiumTestnet.id&&<button className="btn btn-primary" type="button" disabled={network.isPending} onClick={()=>network.switchChain({chainId:elysiumTestnet.id})}>Switch to Elysium Testnet</button>}</>}{(connect.error||network.error)&&<p role="alert" className="error-text">{(connect.error||network.error)?.message.split('\n')[0]}</p>}</div>;
}
