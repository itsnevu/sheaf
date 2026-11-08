import Link from "next/link";
import { elysiumMainnet } from "@/lib/contracts/config";
import { DEPLOYED_CONTRACTS, MAINNET_DEPLOYMENT } from "@/lib/contracts/deployment";

export default function DeploymentReference() {
  const explorer = elysiumMainnet.blockExplorers.default.url;
  return <div>
    <p className="doc-body">RaqioVault, RaqioAirdrop and RaqioScore were deployed on Elysium Mainnet, chain {MAINNET_DEPLOYMENT.chainId}.
      Total paid: 0.0004973761107 native gas units across six confirmed transactions.</p>
    <div className="doc-table-wrap"><table className="doc-table">
      <thead><tr><th>Contract</th><th>Deployed address</th><th>Proof and interface</th></tr></thead>
      <tbody>{DEPLOYED_CONTRACTS.map(({ name, address, transaction, block }) => <tr key={name}>
        <td>{name}</td><td><a className="link break-all" href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer">{address}</a></td>
        <td><a className="link" href={`${explorer}/tx/${transaction}`} target="_blank" rel="noreferrer">Deployment · block {block}</a>
          {" / "}<a className="link" href={`/contracts/${name}.abi.json`} download>ABI</a></td>
      </tr>)}</tbody>
    </table></div>
    <p className="doc-body">Deployment receipts nominate administrator <code className="break-all">{MAINNET_DEPLOYMENT.deployer}</code>.
      The read-only check on 8 November 2026 found this same address as both owner and pending owner on all three contracts.
      The nomination remains pending until the nominated wallet calls <code>acceptOwnership()</code> on each contract.
      The wallet already holds the owner role; the deployment did not transfer control to a different address.</p>
    <p className="doc-body">The vault was deployed with a 25 bps creation fee. Its <code>feeRouter()</code> recipient is that same administrator address,
      rather than a separately deployed FeeRouter contract. Fees can change within the 50 bps cap after a 48-hour delay;
      forms read the current fee before a deposit. Deployment does not establish an independent security audit or explorer source verification.</p>
    <div className="button-row"><a className="btn btn-secondary" href="/contracts/elysium-mainnet-99901.json" download>Download deployment record</a>
      <Link className="link" href="/whitepaper">Read the whitepaper ↗</Link></div>
  </div>;
}
