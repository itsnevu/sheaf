"use client";
import {useId} from "react";

function Wheel({x,y,r=48}:{x:number;y:number;r?:number}){
 const teeth=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48;const radius=(i%4<2)?r:r-5;return `${i?'L':'M'}${(Math.cos(a)*radius).toFixed(2)} ${(Math.sin(a)*radius).toFixed(2)}`;}).join(' ')+'Z';
 return <g transform={`translate(${x} ${y})`}><g className="machine-wheel"><path d={teeth}/><circle r={r-10}/><circle r={r-14}/>{Array.from({length:12},(_,i)=><path key={i} d={`M8 0H${r-15}M8 3H${r-15}`} transform={`rotate(${i*30})`}/>)}<circle r="9"/><circle r="3"/></g></g>;
}
export default function EngravedMachine({variant=0,className=""}:{variant?:number;className?:string}){
 const id=useId().replace(/:/g,'');
 return <svg viewBox="0 0 700 480" fill="none" stroke="currentColor" strokeWidth=".9" className={`machine-engraving ${className}`} aria-hidden="true">
  <defs><pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 5L5 0M4 6L6 4" stroke="currentColor" strokeWidth=".5"/></pattern><pattern id={id+'fine'} width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0V3" stroke="currentColor" strokeWidth=".5"/></pattern></defs>
  <g opacity=".3" strokeWidth=".5"><path d="M40 420L370 460L660 360M40 430L370 470L660 370"/>{Array.from({length:28},(_,i)=><path key={i} d={`M${55+i*20} 435l60-30`}/>)}<path d="M40 50H660M40 45V55M660 45V55M30 70V420M25 70H35M25 420H35" strokeDasharray="2 4"/></g>
  {variant%3===0?<g>
   <path d="M170 380L420 420L590 335L345 300Z" fill={`url(#${id})`}/><path d="M170 380V400L420 440V420M420 440L590 355V335M180 387L415 426M430 418L580 343"/>
   <path d="M260 320V118L286 104V306ZM445 350V150L472 136V337Z" fill={`url(#${id+'fine'})`}/><path d="M260 118L445 150L472 136L286 104ZM260 118V98L445 130V150M260 98L286 84L472 116V136M445 130L472 116" fill={`url(#${id})`}/>
   <path d="M273 118V315M280 114V310M452 151V340M460 145V337"/>
   <path d="M310 210L404 226L440 207L347 191Z M310 210V272L404 289V226M404 289L440 270V207" fill={`url(#${id})`}/><path d="M322 220V262L394 275V234M412 233V274M422 226V269M432 220V263"/>
   <path d="M352 130V200M365 133V202M350 145L367 140M350 152L367 147M350 159L367 154M350 166L367 161M350 173L367 168M350 180L367 175M350 187L367 182M350 194L367 189"/>
   <path d="M325 277V313L400 327L430 312V282M325 313L354 297L430 312M337 319V349L404 362L420 352V317" fill={`url(#${id+'fine'})`}/>
   <g transform="translate(205 280) scale(1 .95)"><Wheel x={0} y={0} r={64}/><Wheel x={0} y={0} r={34}/></g><path d="M205 280L282 259M205 290L282 269M205 217L278 198M205 343L278 323"/>
   <path d="M468 203L527 214V320L468 310Z" fill={`url(#${id+'fine'})`}/><ellipse cx="500" cy="212" rx="30" ry="9"/><ellipse cx="500" cy="322" rx="30" ry="9"/><path d="M490 203V183H515V206M497 183V168H519"/><Wheel x={510} y={282} r={28}/>
   <path d="M287 337L350 350M287 345L350 358M287 353L350 366M287 361L350 374"/>
  </g>:variant%3===1?<g>
   <path d="M145 365L370 415L600 315L377 270Z" fill={`url(#${id})`}/><path d="M145 365V382L370 433V415M370 433L600 333V315"/>
   {[0,1,2].map(i=><g key={i} transform={`translate(${i*95} ${i*-31})`}><path d="M210 345V190L230 180V335M210 190L325 210V365L345 355V200L230 180M325 210L345 200" fill={`url(#${id+'fine'})`}/><Wheel x={268} y={278} r={50}/><path d="M268 228V199M268 328V354M218 278H210M318 278H334"/><path d="M241 234L295 321M237 239L291 326"/></g>)}
   <path d="M140 296C220 266 315 326 398 265S550 205 620 225" className="machine-flow" strokeWidth="2"/>
  </g>:<g>
   <path d="M130 312L460 352L620 280L295 246Z" fill={`url(#${id})`}/><path d="M130 312V328L460 369V352M460 369L620 296V280"/>
   <Wheel x={218} y={345} r={64}/><Wheel x={475} y={374} r={64}/><Wheel x={585} y={308} r={44}/>
   <path d="M175 287V185L435 215V320M175 185L235 151L500 182L435 215M235 151V253M500 182V289" fill={`url(#${id+'fine'})`}/><path d="M160 185L430 218L515 179L242 147Z" fill={`url(#${id})`}/>
   <path d="M190 198L420 226V264L190 236ZM208 200V238M238 203V242M268 207V245M298 211V249M328 214V252M358 218V256M388 222V260"/>
   <path d="M440 230L487 208V263L440 284ZM448 239L479 225M448 251L479 237M448 263L479 249"/>
   <path d="M290 156V126L345 132V163M290 126L317 113L373 119L345 132M345 163L373 150V119" fill={`url(#${id})`}/><path d="M324 114V72H340V116M320 72H344V64H320Z"/>
   <path d="M155 295L450 334M167 303L450 342M211 345L475 374"/><path d="M510 275L597 254V270L510 291Z" fill={`url(#${id+'fine'})`}/>
  </g>}
  <g opacity=".6" strokeWidth=".5"><path d="M155 115H80V150M548 125H620V170M595 370H646V405"/><circle cx="155" cy="115" r="3"/><circle cx="548" cy="125" r="3"/></g>
  <g stroke="none" fill="currentColor" fontFamily="var(--font-mono),monospace" fontSize="8" letterSpacing="2"><text x="70" y="440">RAQIO / RELEASE ENGINE</text><text x="535" y="440">PLATE 00{variant%3+1}</text><text x="60" y="103">DEPOSIT</text><text x="566" y="114">VESTING</text></g>
 </svg>;
}
