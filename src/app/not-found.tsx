import Link from "next/link";
import { LogoLink } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center">
      <LogoLink />
      <h1 className="title-1">Page not found</h1>
      <p className="text-ink-soft max-w-sm">The page you asked for does not exist or you no longer have access to it.</p>
      <div className="flex gap-2">
        <Link href="/" className="btn btn-secondary">
          Home
        </Link>
        <Link href="/app" className="btn btn-primary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
