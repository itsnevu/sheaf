import type { ReactNode } from "react";
import Link from "next/link";
import { LogoLink } from "@/components/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex night flex-col justify-between p-12">
        <LogoLink inverted />
        <div className="max-w-md">
          <p className="eyebrow !text-white/45 mb-4">Private externally · Transparent internally</p>
          <h1 className="display-2">Every payout validated, approved, routed and reconciled on its own.</h1>
          <p className="mt-5 text-white/60 leading-relaxed">Nothing moves before a second person approves the exact recipient set, and nothing is hidden from your finance team.</p>
        </div>
        <p className="text-[0.8rem] text-white/40">
          <Link href="/" className="hover:text-white/70">← Back to site</Link>
        </p>
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="lg:hidden mb-8">
          <LogoLink />
        </div>
        <div className="m-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
