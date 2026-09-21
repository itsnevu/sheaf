export interface TocItem {
  id: string;
  title: string;
}

function List({ items }: { items: TocItem[] }) {
  return (
    <ol className="border-l border-line">
      {items.map((it) => (
        <li key={it.id}>
          <a href={`#${it.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink">
            {it.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Table of contents: a collapsible list on small screens, a sticky rail from lg up. */
export function GuideToc({ items }: { items: TocItem[] }) {
  return (
    <>
      <details className="rounded-md border border-line bg-white/60 px-4 py-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-ink">On this page</summary>
        <nav aria-label="On this page" className="mt-3">
          <List items={items} />
        </nav>
      </details>
      <nav aria-label="Guide sections" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <p className="t-eyebrow mb-3">On this page</p>
        <List items={items} />
      </nav>
    </>
  );
}
