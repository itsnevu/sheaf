import Link from "next/link";
import Image from "next/image";

export function Mark({ size = 28, className = "", white = false }: { size?: number; className?: string; white?: boolean }) {
  return (
    <span aria-hidden="true" className={className} style={{ width: size, height: size, position: "relative", display: "inline-block", overflow: "hidden", flexShrink: 0 }}>
      <Image src={white ? "/brand/meter-white.svg" : "/brand/meter.svg"} alt="" width={size * 2} height={size * 2} unoptimized style={{ position: "absolute", width: "200%", height: "200%", maxWidth: "none", left: "-50%", top: "-50%" }} />
    </span>
  );
}

export function Wordmark({ className = "", white = false }: { className?: string; white?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark white={white} />
      <span className="font-sans text-[0.9375rem] font-medium tracking-[-0.02em] text-fg leading-none">Raqio</span>
    </span>
  );
}

export function LogoLink({ href = "/", white = false }: { href?: string; white?: boolean }) {
  return (
    <Link href={href} aria-label="Raqio home" className="inline-flex items-center">
      <Wordmark white={white} />
    </Link>
  );
}
