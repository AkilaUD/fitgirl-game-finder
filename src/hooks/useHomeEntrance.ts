import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap';
import { useVfx } from '../context/VfxContext';

/** Staggered entrance for header → rig → filters → results (not the game grid). */
export function useHomeEntrance(ready: boolean) {
  const scope = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useVfx();

  useGSAP(
    () => {
      if (!ready || reducedMotion || !scope.current) return;

      const header = scope.current.querySelector('.top');
      const rig = scope.current.querySelector('#rig');
      const filters = scope.current.querySelector('#filters');
      const resultsHead = scope.current.querySelector('.results-head');

      const targets = [header, rig, filters, resultsHead].filter(Boolean);
      if (!targets.length) return;

      gsap.set(targets, { opacity: 0, y: 18 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.09,
        ease: 'power2.out',
        clearProps: 'transform',
      });
    },
    { scope, dependencies: [ready, reducedMotion], revertOnUpdate: true },
  );

  return scope;
}