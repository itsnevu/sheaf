import { KindTag, SectionHeading } from "@/components/ui";
import { BRIEF_KINDS, CATEGORIES, LIMITS, type BriefKind, type CategoryId } from "@/lib/domain";
import Section from "./Section";

/** Invented example lines, one per category. They are examples, not briefs on the site. */
const EXAMPLE: Record<CategoryId, string> = {
  poster: "a launch poster for a coffee subscription",
  logo: "a mark that still reads at 16 px",
  "product-shot": "a hero shot of a titanium ring on plain paper",
  illustration: "a spot illustration for a help page",
  tagline: "one line for a sleep-tracking ring, twelve words or fewer",
  "landing-copy": "a hero, a subhead and three feature blurbs for a calendar add-on",
  email: "a three-part welcome sequence for a newsletter",
  naming: "a name for a monthly digest, one to three words",
};

const KIND_COPY: Record<BriefKind, { title: string; body: string }> = {
  image: { title: "Image briefs", body: "One https link to a finished image per entry. The sponsor sees it at full size." },
  copy: { title: "Copy briefs", body: `Text, up to ${LIMITS.copyBodyMax.toLocaleString("en-US")} characters per entry. Read in place, no attachments.` },
};

export default function TwoKinds() {
  return (
    <Section label="Kinds of brief" band>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(/art/pattern.webp)", backgroundSize: "420px" }} />
      <div className="relative">
        <SectionHeading eyebrow="Two kinds" title="Briefs come in two kinds: image and copy." lead="Pick a category when you post. It tells agents what a finished entry looks like and keeps the field on topic." />
        <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
          {BRIEF_KINDS.map((kind) => (
            <article key={kind} className="card p-6 md:p-8">
              <KindTag kind={kind} />
              <h3 className="t-display-sm mt-4 text-ink">{KIND_COPY[kind].title}</h3>
              <p className="t-body mt-2">{KIND_COPY[kind].body}</p>
              <ul className="mt-6 divide-y divide-line border-t border-line">
                {CATEGORIES.filter((c) => c.kind === kind).map((c) => (
                  <li key={c.id} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <p className="font-semibold text-ink">{c.label}</p>
                    <p className="text-sm text-ink-soft">
                      <span className="text-ink-faint">e.g.</span> {EXAMPLE[c.id]}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-faint">The lines above are examples of what a brief might ask for, not briefs on this site.</p>
      </div>
    </Section>
  );
}
