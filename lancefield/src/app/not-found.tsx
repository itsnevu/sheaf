import Link from "next/link";
import { Mark } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <section aria-labelledby="nf-heading" className="container-x flex flex-col items-center py-24 text-center md:py-32">
      <Mark size={56} animate />
      <Eyebrow className="mt-8">404</Eyebrow>
      <h1 id="nf-heading" className="t-display-md mt-3 text-ink">
        Nothing on this part of the field
      </h1>
      <p className="t-body mt-3 max-w-md">The page you asked for does not exist, or it was moved. The briefs are still where they were.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Go home
        </Link>
        <Link href="/briefs" className="btn btn-secondary">
          Browse briefs
        </Link>
      </div>
    </section>
  );
}
