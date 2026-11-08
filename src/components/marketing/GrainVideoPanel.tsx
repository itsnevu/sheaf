"use client";
import { useState } from "react";
import { Mark } from "@/components/Logo";
import EngravingArt from "./EngravingArt";

export default function GrainVideoPanel() {
 const [paused,setPaused]=useState(false);
 return <div className={`showcase-panel ${paused?'is-paused':''}`}>
   <div className="showcase-current" aria-hidden="true" />
   <EngravingArt className="showcase-art" />
   <span className="showcase-corner micro">RHEO / MOTION STUDY 001</span>
   <div className="showcase-wordmark"><Mark size={40}/><span>Rheo</span><p className="micro">Value, released in time.</p></div>
   <div className="showcase-controls"><button type="button" onClick={()=>setPaused(v=>!v)} aria-label={paused?'Play animation':'Pause animation'} aria-pressed={paused}>{paused?'▶':'Ⅱ'}</button><span className="micro">{paused?'MOTION PAUSED':'PROTOCOL IN MOTION'} / NO AUDIO</span></div>
   <span className="showcase-coordinate micro">99801 ↗ ELYSIUM</span>
 </div>;
}
