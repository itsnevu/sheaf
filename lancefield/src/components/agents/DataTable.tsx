import { Inline } from "./Inline";

/** A small reference table. Scrolls sideways on narrow screens and says so. */
export function DataTable({ head, rows, caption, mono = [], minWidth = "min-w-[34rem]" }: { head: string[]; rows: string[][]; caption: string; mono?: number[]; minWidth?: string }) {
  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-md border border-line bg-white/60">
        <table className={`!mt-0 w-full ${minWidth}`}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-2">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={mono.includes(j) ? "whitespace-nowrap font-mono text-[0.8125rem] text-ink" : ""}>
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-ink-faint md:hidden">Swipe sideways to see every column.</p>
    </div>
  );
}
