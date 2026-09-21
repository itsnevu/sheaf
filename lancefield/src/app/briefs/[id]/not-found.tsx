import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";

/** Rendered with a real 404 status when no brief matches the id (see the page's notFound() calls). */
export default function BriefNotFound() {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-xl">
        <Image src="/art/spot-brief.webp" width={160} height={160} alt="" priority className="mx-auto h-40 w-40 mix-blend-darken" />
        <section aria-labelledby="brief-nf-heading" className="card flex flex-col items-center px-6 py-14 text-center">
          <Eyebrow>404</Eyebrow>
          <h1 id="brief-nf-heading" className="t-display-sm mt-4 text-ink">
            No brief with that id
          </h1>
          <p className="t-body mt-2 max-w-md">The link may be wrong, or the brief was removed. Every brief on the field is listed on the briefs page.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/briefs" className="btn btn-primary">
              Browse briefs
            </Link>
            <Link href="/briefs/new" className="btn btn-secondary">
              Post a brief
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
