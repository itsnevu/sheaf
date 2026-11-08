import type {Metadata} from "next";
import PageHero from "@/components/marketing/PageHero";
import {Section} from "@/components/marketing/Section";
import {ROLLS} from "@/components/reader/rolls";
export const metadata:Metadata={title:'Documentation',description:'Rheo documentation: getting started, operation kinds, workflow, roles, contracts, execution and reconciliation.'};
export default function DocsPage(){return <>
 <PageHero label="RHEO / FIELD MANUAL" title="THE DETAILS." second="IN PLAIN SIGHT." description="Getting started, operation kinds, workflow and roles. The complete desk manual, kept in one place."/>
 <Section tone="paper"><div className="container-site editorial-layout"><aside className="editorial-index"><p className="micro mb-4">IN THIS MANUAL</p>{ROLLS.map(r=><a href={`#doc-${r.code}`} key={r.code}>{r.code} / {r.title}</a>)}</aside><div>{ROLLS.map(r=><article className="editorial-article" id={`doc-${r.code}`} key={r.code}><p className="micro mb-3">DOCUMENT / {r.code}</p><h2>{r.title}</h2><pre className="doc-lines">{r.lines.slice(5).join('\n')}</pre></article>)}</div></div></Section>
 </>;}
