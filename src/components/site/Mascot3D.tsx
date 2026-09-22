"use client";

import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, Sparkles, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { MathUtils } from "three";

/**
 * The courier as a real 3D model (GLB generated from the mascot render). It idles with a slow
 * float, turns toward the pointer, and is lit in the brand's pink and violet. The poster image
 * behind it stays until the model has loaded, and stays for good if the model cannot load.
 */

const MODEL = "/art/3d/mascot.glb";
const FRONT = 4.45; // radians of yaw for the three-quarter view: visor and the stack of cards toward the viewer

function Model({ pointer, onLoaded }: { pointer: React.MutableRefObject<{ x: number; y: number }>; onLoaded: () => void }) {
  // The GLB is pre-fitted (2.6 units tall at most, feet at y=0, centred on x/z), so no runtime measuring.
  const { scene } = useGLTF(MODEL, undefined, true); // meshopt-compressed; decoder ships with drei
  const group = useRef<Group>(null);
  const front = useRef(FRONT);

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as { castShadow?: boolean; receiveShadow?: boolean; isMesh?: boolean };
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    // Debug aid: /?yaw=1.57 overrides the resting yaw while tuning a new model.
    const yaw = Number(new URLSearchParams(window.location.search).get("yaw"));
    if (Number.isFinite(yaw) && yaw !== 0) front.current = yaw;
    onLoaded();
  }, [scene, onLoaded]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const targetY = front.current + pointer.current.x * 0.6 + Math.sin(state.clock.elapsedTime * 0.35) * 0.25;
    const targetX = -pointer.current.y * 0.25;
    g.rotation.y = MathUtils.damp(g.rotation.y, targetY, 3, dt);
    g.rotation.x = MathUtils.damp(g.rotation.x, targetX, 3, dt);
  });

  return (
    <group ref={group} position={[0, -1.25, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function Rig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.35, 5.2);
    camera.lookAt(0, 0.1, 0);
  }, [camera]);
  return null;
}

/** If the model fails to load or WebGL dies, drop the canvas and keep the poster. */
class Guard extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[mascot3d] falling back to the still image:", error.message);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Mascot3D({ onLoaded }: { onLoaded: (ok: boolean) => void }) {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return (
    <Guard onError={() => onLoaded(false)}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 32 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
        <Rig />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-4, 2, 2]} intensity={14} color="#ff2e55" distance={12} />
        <pointLight position={[4, -1, -3]} intensity={10} color="#6852fd" distance={12} />
        <spotLight position={[0, 6, 2]} intensity={6} angle={0.5} penumbra={1} color="#ffffff" />
        <Suspense fallback={null}>
          <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.6} floatingRange={[-0.08, 0.12]}>
            <Model pointer={pointer} onLoaded={() => onLoaded(true)} />
          </Float>
          <ContactShadows position={[0, -1.26, 0]} opacity={0.55} scale={6} blur={2.6} far={3} color="#000000" />
          <Sparkles count={40} scale={[5, 4, 3]} size={2.5} speed={0.35} opacity={0.5} color="#ff2e55" />
        </Suspense>
      </Canvas>
    </Guard>
  );
}
