"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect,useRef,useState } from "react";
import { motion } from "framer-motion";
import { LogoLink } from "@/components/Logo";
const LINKS=[{href:'/#capabilities',label:'Capabilities'},{href:'/#fees',label:'Fees'},{href:'/docs',label:'Docs'},{href:'/security',label:'Security'}];
export default function Navbar({signedIn=false}:{signedIn?:boolean}){
 const [scrolled,setScrolled]=useState(false);const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const path=usePathname();
 useEffect(()=>{const scroll=()=>setScrolled(window.scrollY>120);scroll();window.addEventListener('scroll',scroll,{passive:true});return()=>window.removeEventListener('scroll',scroll);},[]);
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{if(open){dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};}dialog.current?.close();},[open]);
 return <>
  <header className={`engraving-nav ${scrolled?'is-floating':''}`}>
   <motion.div layout className="engraving-nav-inner" transition={{duration:.4,ease:[.16,1,.3,1]}}>
    <LogoLink/>
    <nav aria-label="Primary" className="engraving-nav-links">{LINKS.map(l=><Link key={l.href} href={l.href} aria-current={path===l.href?'page':undefined}>{l.label}</Link>)}</nav>
    <div className="engraving-nav-actions"><span className="network-label micro">CHAIN 99801</span><Link href="/sign-in" className="nav-signin">Sign in</Link><Link href={signedIn?'/app':'/sign-in'} className="btn btn-primary">Launch app ↗</Link><span className="nav-language micro" lang="en">EN</span><button type="button" className="nav-menu" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>☰</button></div>
   </motion.div>
  </header>
  <dialog ref={dialog} className="nav-sheet" onClose={()=>setOpen(false)}>
   <div className="nav-sheet-top"><LogoLink/><button type="button" className="btn btn-secondary" onClick={()=>setOpen(false)}>Close ×</button></div>
   <nav aria-label="Mobile">{[...LINKS,{href:'/privacy',label:'Privacy'},{href:'/sign-in',label:'Sign in'}].map((l,i)=><Link href={l.href} key={l.href} onClick={()=>setOpen(false)}><span className="micro">0{i+1}</span>{l.label} ↗</Link>)}</nav>
   <p className="micro">Rheo / Elysium Testnet / tokens have no value</p>
  </dialog>
 </>;
}
