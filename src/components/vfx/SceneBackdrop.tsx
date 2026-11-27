import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSiteTheme } from '../../context/ThemeContext';
import { useVfx } from '../../context/VfxContext';
import { paletteForTheme } from '../../lib/themeColors';
import type { VfxIntensity } from '../../context/VfxContext';
import type { SiteThemeId } from '../../lib/siteTheme';

const AURORA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uMouse;
  uniform vec3 uPink;
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p * freq);
      freq *= 2.05;
      amp *= 0.48;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 drift = vec2(uTime * 0.018, uTime * 0.012);
    vec2 p = uv * vec2(2.8, 1.6) + drift + uMouse * 0.08;

    float n1 = fbm(p);
    float n2 = fbm(p + vec2(1.7, -0.4) + uTime * 0.02);
    float blob = smoothstep(0.25, 0.92, n1 * 0.55 + n2 * 0.45);
    blob = pow(blob, 1.4);

    float horizon = smoothstep(0.0, 1.0, uv.y);
    vec3 col = mix(uPink, uCyan, uv.x + 0.15 * sin(uTime * 0.3 + uv.y * 4.0));
    col = mix(col, uMagenta, n2 * 0.35);
    vec3 base = vec3(0.03, 0.015, 0.04);
    float strength = blob * (0.35 + uIntensity * 0.35) * (0.4 + 0.6 * (1.0 - horizon));
    vec3 aurora = base + col * strength;

    gl_FragColor = vec4(aurora, strength * 0.65 + 0.08);
  }
`;

const AURORA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function AuroraPlane({
  intensity,
  themeId,
}: {
  intensity: VfxIntensity;
  themeId: SiteThemeId;
}) {
  const palette = paletteForTheme(themeId);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity === 'ultra' ? 1 : 0.45 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPink: { value: new THREE.Color(palette.pink) },
        uCyan: { value: new THREE.Color(palette.cyan) },
        uMagenta: { value: new THREE.Color(palette.magenta) },
      },
      vertexShader: AURORA_VERT,
      fragmentShader: AURORA_FRAG,
    });
  }, [intensity, palette.pink, palette.cyan, palette.magenta]);

  useEffect(() => {
    mat.uniforms.uIntensity.value = intensity === 'ultra' ? 1 : 0.45;
    mat.uniforms.uPink.value.set(palette.pink);
    mat.uniforms.uCyan.value.set(palette.cyan);
    mat.uniforms.uMagenta.value.set(palette.magenta);
  }, [intensity, palette, mat]);

  const { pointer } = useThree();

  useFrame((_, delta) => {
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uMouse.value.set(pointer.x, pointer.y);
  });

  return (
    <mesh position={[0, 0, -2]} scale={[14, 9, 1]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function SceneContent({
  starCount,
  intensity,
  themeId,
}: {
  starCount: number;
  intensity: VfxIntensity;
  themeId: SiteThemeId;
}) {
  const palette = paletteForTheme(themeId);
  return (
    <>
      <color attach="background" args={[palette.black]} />
      <Stars radius={80} depth={40} count={starCount} factor={3} fade speed={0.6} />
      <AuroraPlane intensity={intensity} themeId={themeId} />
    </>
  );
}

export function SceneBackdrop() {
  const { intensity, reducedMotion } = useVfx();
  const { theme } = useSiteTheme();
  const palette = paletteForTheme(theme);
  const [active, setActive] = useState(!document.hidden);
  const starCount = intensity === 'ultra' ? 6000 : 2200;

  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const [ar, ag, ab] = hexToRgb(palette.pink);
  const [gr, gg, gb] = hexToRgb(palette.cyan);

  if (reducedMotion) {
    return (
      <div
        className="vfx-backdrop"
        aria-hidden
        style={{
          background: `radial-gradient(700px 380px at 80% -10%, rgba(${ar},${ag},${ab},.13), transparent 70%), radial-gradient(620px 360px at 8% 104%, rgba(${gr},${gg},${gb},.07), transparent 72%), ${palette.bg}`,
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
          <SceneContent starCount={starCount} intensity={intensity} themeId={theme} />
        </Suspense>
      </Canvas>
    </div>
  );
}