import LockDetail from "@/components/app/LockDetail";

/** Stream IDs are lock IDs in the deployed RaqioVault. */
export default function StreamDetail({ id }: { id: string }) {
  return <LockDetail value={id} />;
}
