import LockDetail from "@/components/app/LockDetail";
export const metadata={title:'Lock proof'};
export default function LockProofPage({params}:{params:{id:string}}){return <section className="engraving-section pt-40"><div className="container-site"><LockDetail value={params.id}/></div></section>;}
