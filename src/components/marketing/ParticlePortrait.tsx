"use client";

import { useEffect, useRef } from "react";

export default function ParticlePortrait() {
 const ref = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const canvas=ref.current;
  if(!canvas) return;
  const ctx=canvas.getContext("2d");
  if(!ctx) return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(media.matches || (navigator.hardwareConcurrency && navigator.hardwareConcurrency<4)) return;
  let points:number[][]=[]; let frame=0; let visible=false; let disposed=false; let last=0;
  let width=0;let height=0;
  const pointer={x:-1000,y:-1000};
  const resize=()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
  const draw=(time:number)=>{
   frame=0;
   if(disposed || !visible || document.hidden || media.matches) return;
   frame=requestAnimationFrame(draw);
   if(time-last<33 || !points.length) return;
   last=time;ctx.clearRect(0,0,width,height);ctx.fillStyle=getComputedStyle(canvas).getPropertyValue("--ice").trim();
   points.forEach(([px,py],i)=>{const x=px*width,y=py*height;const dx=x-pointer.x,dy=y-pointer.y;const d=Math.hypot(dx,dy);const repel=Math.max(0,1-d/80)*10;const drift=Math.sin(time*.00035+i*1.7)*.9;const rx=x+(d?dx/d:0)*repel+drift,ry=y+(d?dy/d:0)*repel;ctx.globalAlpha=py>.78?Math.max(0,(1-py)/.22):.9;ctx.fillRect(rx,ry,width/330,width/330);});
   canvas.dataset.ready="true";
  };
  const sync=()=>{cancelAnimationFrame(frame);frame=0;if(visible&&!document.hidden&&!media.matches)frame=requestAnimationFrame(draw);if(media.matches)delete canvas.dataset.ready;};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(canvas);
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const controller=new AbortController();
  fetch('/art/engraving/particles.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Art unavailable');return r.json();}).then((data:number[][])=>{if(!disposed)points=data.filter((_,i)=>i%2===0).slice(0,3600);}).catch(()=>{});
  const move=(e:PointerEvent)=>{if(e.pointerType!=="mouse")return;const r=canvas.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;};
  const leave=()=>{pointer.x=pointer.y=-1000;};
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
  return()=>{disposed=true;controller.abort();cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);};
 },[]);
 return <canvas ref={ref} className="particle-portrait" aria-hidden="true" />;
}
