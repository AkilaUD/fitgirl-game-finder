import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type VfxIntensity = 'normal' | 'ultra';

interface VfxContextValue {
  intensity: VfxIntensity;
  setIntensity: (v: VfxIntensity) => void;
  reducedMotion: boolean;
}

const VfxContext = createContext<VfxContextValue | null>(null);

export function VfxProvider({ children }: { children: ReactNode }) {
  const [intensity, setIntensity] = useState<VfxIntensity>('ultra');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const value = useMemo(
    () => ({ intensity, setIntensity, reducedMotion }),
    [intensity, reducedMotion],
  );

  return <VfxContext.Provider value={value}>{children}</VfxContext.Provider>;
}

export function useVfx() {
  const ctx = useContext(VfxContext);
  if (!ctx) throw new Error('useVfx must be used within VfxProvider');
  return ctx;
}