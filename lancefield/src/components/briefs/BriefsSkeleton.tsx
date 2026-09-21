import { Skeleton } from "@/components/ui";

/**
 * Placeholder for the briefs list while its data streams. Used as an in-page Suspense fallback
 * on /briefs rather than as a segment loading.tsx: a loading file in src/app/briefs would also
 * wrap /briefs/[id] and /briefs/new, and a notFound() thrown inside that boundary streams as 200.
 */
export default function BriefsSkeleton() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container-x py-12 lg:py-16">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-12 w-48" />
          <Skeleton className="mt-5 h-5 w-full max-w-xl" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-md" />
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-9 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-b border-line bg-paper-2/60">
        <div className="container-x flex flex-col gap-4 py-4">
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-60" />
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>
      </section>
      <section className="container-x py-10" aria-busy="true" aria-label="Loading briefs">
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="mt-4 h-6 w-11/12" />
              <Skeleton className="mt-2 h-6 w-3/5" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <div className="mt-6 flex items-end justify-between border-t border-line pt-4">
                <div>
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="mt-2 h-7 w-24" />
                </div>
                <div className="flex flex-col items-end">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1.5 h-4 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
