import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, useGSAP } from '../../lib/gsap';
import { THEME } from '../../lib/themeColors';
import { useVfx } from '../../context/VfxContext';

interface GlitchTitleProps {
  to?: string;
  children: string;
  className?: string;
}

export function GlitchTitle({ to = '/', children, className }: GlitchTitleProps) {
  const scope = useRef<HTMLSpanElement>(null);
  const { intensity, reducedMotion } = useVfx();

  useGSAP(
    () => {
      if (reducedMotion || !scope.current) return;

      const main = scope.current.querySelector('.glitch-main');
      const pink = scope.current.querySelector('.glitch-pink');
      const cyan = scope.current.querySelector('.glitch-cyan');
      if (!main || !pink || !cyan) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(pink, { opacity: 0, x: 0, skewX: 0 });
        gsap.set(cyan, { opacity: 0, x: 0, skewX: 0 });
        gsap.set(main, { opacity: 1, x: 0, skewX: 0, clearProps: 'textShadow' });

        let nextBurst: gsap.core.Tween | null = null;

        const burst = () => {
          const dur = intensity === 'ultra' ? 0.12 : 0.08;
          gsap
            .timeline()
            .to(pink, { x: intensity === 'ultra' ? 4 : 2, skewX: -8, opacity: 0.85, duration: dur }, 0)
            .to(cyan, { x: intensity === 'ultra' ? -4 : -2, skewX: 8, opacity: 0.85, duration: dur }, 0)
            .to(main, { x: 1, skewX: 2, duration: dur }, 0)
            .to(
              pink,
              { x: 0, skewX: 0, opacity: 0, duration: dur * 1.2, ease: 'power2.out' },
              dur,
            )
            .to(
              cyan,
              { x: 0, skewX: 0, opacity: 0, duration: dur * 1.2, ease: 'power2.out' },
              dur,
            )
            .to(main, { x: 0, skewX: 0, duration: dur * 1.2, ease: 'power2.out' }, dur);

          const delay = intensity === 'ultra' ? 2.8 + Math.random() * 2.5 : 6 + Math.random() * 4;
          nextBurst = gsap.delayedCall(delay, burst);
        };

        if (intensity === 'ultra') {
          burst();
        } else {
          gsap.to(main, {
            textShadow: `0 0 12px ${THEME.pink}44`,
            repeat: -1,
            yoyo: true,
            duration: 2.4,
            ease: 'sine.inOut',
          });
        }

        return () => {
          nextBurst?.kill();
          gsap.killTweensOf([pink, cyan, main]);
        };
      });

      return () => mm.revert();
    },
    { scope, dependencies: [intensity, reducedMotion], revertOnUpdate: true },
  );

  const content = (
    <span ref={scope} className={`glitch-wrap${className ? ` ${className}` : ''}`}>
      <span className="glitch-layer glitch-pink" aria-hidden="true">
        {children}
      </span>
      <span className="glitch-layer glitch-cyan" aria-hidden="true">
        {children}
      </span>
      <span className="glitch-layer glitch-main">{children}</span>
    </span>
  );

  return (
    <Link to={to} className="glitch-title-link">
      {content}
    </Link>
  );
}