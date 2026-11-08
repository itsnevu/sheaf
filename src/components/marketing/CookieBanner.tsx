"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
export default function CookieBanner(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{try{setVisible(!localStorage.getItem('rheo-cookie-choice'));}catch{setVisible(true);}},[]);
 const choose=(value:string)=>{try{localStorage.setItem('rheo-cookie-choice',value);}catch{}setVisible(false);};
 if(!visible)return null;
 return <aside className="cookie-banner" aria-label="Cookie preferences"><p className="micro">A NOTE ON COOKIES</p><p>Only essential session cookies are used. No analytics or tracking scripts.</p><div><Link href="/privacy">Privacy notice ↗</Link><button type="button" className="btn btn-secondary btn-sm" onClick={()=>choose('essential')}>Reject optional</button><button type="button" className="btn btn-primary btn-sm" onClick={()=>choose('accepted')}>Accept all</button></div></aside>;
}
