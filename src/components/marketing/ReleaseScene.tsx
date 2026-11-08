"use client";
import {Canvas,useFrame} from '@react-three/fiber';
import {Float} from '@react-three/drei';
import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import {Group} from 'three';
function Engine(){
 const ref=useRef<Group>(null);
 useFrame(({clock,pointer},delta)=>{if(!ref.current)return;const t=clock.elapsedTime;ref.current.rotation.y+=(.34+pointer.x*.18-ref.current.rotation.y)*Math.min(delta*2,1);ref.current.rotation.x+=(-.12-pointer.y*.08-ref.current.rotation.x)*Math.min(delta*2,1);ref.current.position.y=Math.sin(t*.5)*.035;});
 return <Float speed={1} floatIntensity={.15} rotationIntensity={.08}><group ref={ref} rotation={[-.12,.34,0]}>
  {[-1,0,1].map((x,i)=><group key={x} position={[x*.85,0,-i*.22]}>
   <mesh position={[-.25,0,0]} castShadow><boxGeometry args={[.13,1.6,.5]}/><meshStandardMaterial color="ivory" metalness={.45} roughness={.23}/></mesh>
   <mesh position={[.25,0,0]} castShadow><boxGeometry args={[.13,1.6,.5]}/><meshStandardMaterial color="ivory" metalness={.45} roughness={.23}/></mesh>
   <mesh position={[0,.76,0]} castShadow><boxGeometry args={[.62,.16,.5]}/><meshStandardMaterial color="ivory" metalness={.45} roughness={.23}/></mesh>
   <mesh position={[0,-.76,0]} castShadow><boxGeometry args={[.62,.16,.5]}/><meshStandardMaterial color="ivory" metalness={.45} roughness={.23}/></mesh>
   <mesh position={[0,.1-i*.25,.05]} castShadow><cylinderGeometry args={[.19,.19,.16,48]}/><meshStandardMaterial color="royalblue" metalness={.25} roughness={.22}/></mesh>
   <mesh position={[0,0,0]}><cylinderGeometry args={[.018,.018,1.4,12]}/><meshStandardMaterial color="ivory" metalness={.7} roughness={.2}/></mesh>
  </group>)}
  <mesh position={[0,-.92,-.22]} castShadow><boxGeometry args={[3,.14,1.1]}/><meshStandardMaterial color="ivory" metalness={.5} roughness={.22}/></mesh>
 </group></Float>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?null:this.props.children;}}
export default function ReleaseScene({onReady}:{onReady:()=>void}){
 const [visible,setVisible]=useState(true);const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=host.current;if(!el)return;let intersects=true;const sync=()=>setVisible(intersects&&!document.hidden);const ob=new IntersectionObserver(([e])=>{intersects=e.isIntersecting;sync();});ob.observe(el);document.addEventListener('visibilitychange',sync);return()=>{ob.disconnect();document.removeEventListener('visibilitychange',sync);};},[]);
 return <div ref={host} className="release-canvas"><SceneBoundary><Canvas dpr={[1,1.5]} frameloop={visible?'always':'never'} camera={{position:[3,1.8,5.5],fov:35}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={()=>onReady()}><ambientLight intensity={1.8}/><directionalLight position={[3,5,4]} intensity={4}/><directionalLight position={[-4,1,2]} intensity={2}/><Engine/></Canvas></SceneBoundary></div>;
}
