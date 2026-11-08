import LockExplorer from "@/components/app/LockExplorer";

export default function StreamsList() {
  return <><p className="help mb-6">Streams use the deployed vault. This explorer includes all vault lock types; search by wallet, token or lock ID.</p><LockExplorer /></>;
}
