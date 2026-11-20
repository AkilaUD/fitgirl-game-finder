import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useVfx } from '../../context/VfxContext';

function ShaderGrid() {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uPink: { value: new THREE.Color('#f72585') },
        uCyan: { value: new THREE.Color('#00ffea') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uPink;
        uniform vec3 uCyan;
        varying vec2 vUv;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          vec2 uv = vUv;
          float grid = step(0.98, max(fract(uv.x * 40.0), fract(uv.y * 24.0)));
          float scan = sin((uv.y + uTime * 0.04) * 12.0) * 0.5 + 0.5;
          vec3 base = vec3(0.02, 0.01, 0.04);
          vec3 accent = mix(uPink, uCyan, uv.x) * (grid * 0.35 + scan * 0.08);
          gl_FragColor = vec4(base + accent, 0.55);
        }
      `,
    });
  }, []);

  useFrame((_, delta) => {
    mat.uniforms.uTime.value += delta;
  });

  return (
    <mesh position={[0, 0, -2]} scale={[12, 8, 1]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function SceneContent({ starCount }: { starCount: number }) {
  return (
    <>
      <color attach="background" args={['#070509']} />
      <Stars radius={80} depth={40} count={starCount} factor={3} fade speed={0.6} />
      <ShaderGrid />
    </>
  );
}

export function SceneBackdrop() {
  const { intensity, reducedMotion } = useVfx();
  const [active, setActive] = useState(!document.hidden);
  const starCount = intensity === 'ultra' ? 6000 : 2200;

  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (reducedMotion) {
    return (
      <div
        className="vfx-backdrop"
        aria-hidden
        style={{
          background:
            'radial-gradient(700px 380px at 80% -10%, rgba(247,37,133,.13), transparent 70%), radial-gradient(620px 360px at 8% 104%, rgba(0,255,234,.07), transparent 72%), #0B0810',
        }}
      />
    );
  }

  return (
    <div className="vfx-backdrop" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2], fov: 60 }}
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: false, alpha: true }}
      >
        <Suspense fallback={null}>
          <SceneContent starCount={starCount} />
        </Suspense>
      </Canvas>
    </div>
  );
}