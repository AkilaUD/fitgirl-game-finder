import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useVfx } from '../../context/VfxContext';

interface HeaderBarProps {
  query: string;
  onQuery: (q: string) => void;
  onScan: () => void;
  scanning: boolean;
}

export function HeaderBar({ query, onQuery, onScan, scanning }: HeaderBarProps) {
  const { intensity, setIntensity, reducedMotion } = useVfx();

  return (
    <header className="top">
      <div className="brand">
        <Link className="mark" to="/" aria-label="Repack Finder home" />
        <div>
          <h1>
            <Link to="/" className={!reducedMotion && intensity === 'ultra' ? 'glitch-title' : undefined}>
              Repack Finder
            </Link>
          </h1>
          <p>FitGirl repacks, filtered by size, date and what your PC can actually run.</p>
        </div>
      </div>
      <div className="top-actions">
        <label className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search 5,300 repacks…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <div className="intensity-toggle" title="Visual effects intensity">
          <button type="button" className={intensity === 'normal' ? 'on' : ''} onClick={() => setIntensity('normal')}>
            Normal
          </button>
          <button type="button" className={intensity === 'ultra' ? 'on' : ''} onClick={() => setIntensity('ultra')}>
            Ultra
          </button>
        </div>
        <motion.button
          type="button"
          className="btn primary"
          onClick={onScan}
          disabled={scanning}
          whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        >
          {scanning ? 'Scanning…' : 'Scan my PC'}
        </motion.button>
      </div>
    </header>
  );
}