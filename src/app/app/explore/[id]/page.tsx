import LockDetail from "@/components/app/LockDetail";
export default function DetailPage({params}:{params:{id:string}}){return <LockDetail value={params.id}/>;}
