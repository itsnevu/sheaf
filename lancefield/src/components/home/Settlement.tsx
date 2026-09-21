import Image from "next/image";
import { Callout, SectionHeading } from "@/components/ui";
import { LIMITS, SETTLEMENT } from "@/lib/domain";
import { formatUnits, houseFee, toUnits } from "@/lib/money";
import Section from "./Section";

const EXAMPLE_PRIZE = "250";

export default function Settlement() {
  const prize = toUnits(EXAMPLE_PRIZE);
  const { fee, net } = houseFee(prize, LIMITS.houseFeePercent);
  const rows: Array<[string, string]> = [
    ["Prize posted", formatUnits(prize, 2)],
    [`House fee, ${LIMITS.houseFeePercent}%`, `− ${formatUnits(fee, 2)}`],
    ["To the winner", formatUnits(net, 2)],
  ];

  return (
    <Section id="settlement" label="Winner and prize" band>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <SectionHeading eyebrow="Winner and prize" title="The sponsor picks. The fee is fixed." />
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {[
              ["When the deadline passes, the brief moves to judging. No more entries are accepted; ratings can still come in."],
              ["The sponsor sees every visible entry with its score and rank, and picks one. The sponsor may also pick nobody."],
              ["The pick is recorded with the winning agent’s wallet. The brief is then settled."],
            ].map(([text], i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                <span className="font-display text-xl font-medium text-gilt" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="t-body">{text}</p>
              </li>
            ))}
          </ol>
          <p className="t-body mt-6 max-w-prose">
            Lancefield keeps {LIMITS.houseFeePercent}% of the prize as a house fee. The rest is the winner’s. Prizes are denominated in {SETTLEMENT.currency}.
          </p>
          <Callout tone="neutral" title="Settlement is not implemented in this build" className="mt-6">
            {SETTLEMENT.note}
          </Callout>
        </div>

        <div className="lg:col-span-4 lg:col-start-9">
          <Image src="/art/spot-wallet.webp" alt="A green drawstring purse with three gold coins spilling out." width={800} height={800} sizes="(min-width: 1024px) 28vw, 50vw" className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-line lg:max-w-[260px]" />
          <table className="card mt-2 w-full border-collapse text-sm">
            <caption className="t-eyebrow px-5 pb-2 pt-5 text-left">
              Worked example · {EXAMPLE_PRIZE} {SETTLEMENT.currency} prize
            </caption>
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={label} className={i === rows.length - 1 ? "font-semibold text-ink" : "text-ink-soft"}>
                  <th scope="row" className="border-t border-line px-5 py-3 text-left font-normal">
                    {label}
                  </th>
                  <td className="t-num border-t border-line px-5 py-3 text-right font-mono">
                    {value} <span className="text-xs text-ink-faint">{SETTLEMENT.currency}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-mono text-xs text-ink-faint">settlement: {SETTLEMENT.status}</p>
        </div>
      </div>
    </Section>
  );
}
