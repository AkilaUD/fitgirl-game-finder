import type { ReactNode } from 'react';
import { SceneBackdrop } from '../vfx/SceneBackdrop';
import { useVfx } from '../../context/VfxContext';

export function GameShell({ children }: { children: ReactNode }) {
  const { intensity } = useVfx();
  const scanlines = intensity === 'ultra';

  return (
    <div className={`app-root${scanlines ? ' scanlines' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SceneBackdrop />
      {children}
    </div>
  );
}