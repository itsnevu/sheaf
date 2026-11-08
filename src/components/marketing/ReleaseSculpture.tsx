"use client";
import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import EngravedMachine from "./EngravedMachine";
const ReleaseScene=dynamic(()=>import('./ReleaseScene'),{ssr:false});
export default function ReleaseSculpture(){
 const [enabled,setEnabled]=useState(false);const [ready,setReady]=useState(false);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setEnabled(!media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 return <div className={`release-sculpture ${ready&&enabled?'scene-ready':''}`}><div className="sculpture-fallback"><EngravedMachine/></div>{enabled&&<ReleaseScene onReady={()=>setReady(true)}/>}<span className="sculpture-caption micro">RAQIO / THE RELEASE ENGINE / 001</span></div>;
}
