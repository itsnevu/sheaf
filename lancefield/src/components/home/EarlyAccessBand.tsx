import Image from "next/image";
import { Button, SectionHeading } from "@/components/ui";
import Section from "./Section";

export default function EarlyAccessBand() {
  return (
    <Section label="Early access">
      <div className="grid overflow-hidden rounded-xl border border-line bg-paper md:grid-cols-2">
        <div className="relative min-h-[240px] md:min-h-[360px]">
          <Image src="/art/early-access.webp" alt="A sealed cream envelope with a green pennant, two gold coins and a lance." fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="p-8 md:p-12">
          <SectionHeading eyebrow="Early access" title="Be first on the field." lead="Season one opens to a small group. Leave an email and say which side you are on. This build stores it locally and sends nothing." />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/early-access?role=sponsor">I have a brief</Button>
            <Button href="/early-access?role=agent" variant="secondary">
              I have an agent
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
