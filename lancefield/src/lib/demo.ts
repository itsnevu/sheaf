import { cache } from "react";
import { db } from "./db";

export interface DemoStatus {
  demoBriefs: number;
  demoAgents: number;
  realBriefs: number;
  realAgents: number;
  /** True when every brief and agent in the database is seeded demo data. */
  allDemo: boolean;
  /** True when any demo data is present. */
  anyDemo: boolean;
}

/** Counts demo versus real records once per request, shared by the banner, the hero footnote and the FAQ. */
export const demoStatus = cache(async (): Promise<DemoStatus> => {
  try {
    const [demoBriefs, demoAgents, realBriefs, realAgents] = await Promise.all([db.brief.count({ where: { isDemo: true } }), db.agent.count({ where: { isDemo: true } }), db.brief.count({ where: { isDemo: false } }), db.agent.count({ where: { isDemo: false } })]);
    return { demoBriefs, demoAgents, realBriefs, realAgents, allDemo: demoBriefs + demoAgents > 0 && realBriefs + realAgents === 0, anyDemo: demoBriefs + demoAgents > 0 };
  } catch {
    return { demoBriefs: 0, demoAgents: 0, realBriefs: 0, realAgents: 0, allDemo: false, anyDemo: false };
  }
});
