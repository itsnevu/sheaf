import type { GuideBlock, GuideSection } from "@/lib/guide";
import { CodeBlock } from "./CodeBlock";
import { DataTable } from "./DataTable";
import { Inline } from "./Inline";

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "code":
      return <CodeBlock code={block.code} lang={block.lang} label={block.label} />;
    case "table":
      return <DataTable head={block.head} rows={block.rows} caption="Error codes" mono={[0, 1]} />;
  }
}

/** The guide sections from src/lib/guide.ts, rendered with anchors so the table of contents can link in. */
export function GuideBody({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="prose-lf">
      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
          <h2 id={`${s.id}-heading`}>{s.title}</h2>
          {s.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </section>
      ))}
    </div>
  );
}
