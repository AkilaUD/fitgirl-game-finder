import { motion } from 'motion/react';
import type { Game, PcProfile } from '../../lib/gameTypes';
import { fmtDate, fmtGb, pctSaved } from '../../lib/format';
import { VerdictBadge } from '../shared/VerdictBadge';
import { predict } from '../../lib/predict';
import { useVfx } from '../../context/VfxContext';

interface GameCardProps {
  game: Game;
  pc: PcProfile;
  hasRig: boolean;
  index?: number;
  onOpen: (id: number) => void;
}

export function GameCard({ game, pc, hasRig, index = 0, onOpen }: GameCardProps) {
  const { reducedMotion } = useVfx();
  const v = hasRig ? (game.steam ? predict(game, pc).verdict : 'nodata') : null;
  const saved = pctSaved(game);
  const tags = (game.tags || []).slice(0, 2).join(' · ');

  return (
    <motion.article
      className="card"
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.35 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      onClick={() => onOpen(game.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(game.id);
        }
      }}
    >
      {game.img ? (
        <div className="thumb">
          <img
            src={game.img}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const thumb = e.currentTarget.closest('.thumb');
              thumb?.classList.add('missing');
              e.currentTarget.remove();
            }}
          />
        </div>
      ) : (
        <div className="thumb missing">
          <span aria-hidden="true">{(game.title || '?').trim().charAt(0)}</span>
        </div>
      )}
      <div className="card-top">
        <span className="pill">{fmtGb(game.sizeGb)}</span>
        {v ? <VerdictBadge verdict={v} /> : null}
      </div>
      <h3>{game.title}</h3>
      <p className="meta">
        {fmtDate(game.date)}
        {tags ? ` · ${tags}` : ''}
      </p>
      <div className="sizes">
        <s>{fmtGb(game.origGb)}</s> <b>{fmtGb(game.sizeGb)}</b>
        {saved != null ? <span className="save">−{saved}%</span> : null}
      </div>
    </motion.article>
  );
}