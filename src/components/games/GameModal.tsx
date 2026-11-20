import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Game, PcProfile } from '../../lib/gameTypes';
import type { ReqBlock } from '../../lib/specs';
import { evaluate } from '../../lib/specs';
import { fmtDate, fmtGb, pctSaved } from '../../lib/format';
import { VerdictBadge } from '../shared/VerdictBadge';
import { checkField } from '../../lib/predict';

interface GameModalProps {
  game: Game | null;
  pc: PcProfile;
  hasRig: boolean;
  onClose: () => void;
}

export function GameModal({ game, pc, hasRig, onClose }: GameModalProps) {
  useEffect(() => {
    if (!game) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [game, onClose]);

  return (
    <AnimatePresence>
      {game ? (
        <motion.div
          className="modal scanline-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mTitle"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
              ✕
            </button>
            <ModalBody game={game} pc={pc} hasRig={hasRig} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ModalBody({ game, pc, hasRig }: { game: Game; pc: PcProfile; hasRig: boolean }) {
  const ev = hasRig && game.steam ? evaluate(game, pc) : null;
  const saved = pctSaved(game);
  const steam = game.steam || null;

  return (
    <>
      {game.img ? (
        <div className="m-banner">
          <img
            src={game.img}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => e.currentTarget.closest('.m-banner')?.remove()}
          />
        </div>
      ) : null}
      <h2 className="m-title" id="mTitle">
        {game.title}
      </h2>
      <div className="m-meta">
        <span>{fmtDate(game.date)}</span>
        {game.tags?.length ? <span>{game.tags.join(', ')}</span> : null}
        {game.companies ? <span>by {game.companies}</span> : null}
        {game.languages ? <span>{game.languages}</span> : null}
      </div>
      {ev ? (
        <div className="m-yourpc">
          <VerdictBadge verdict={ev.verdict} />
          <span className="pill">
            Your GPU index <b>{pc.gpuScore ?? '—'}</b>
          </span>
          <span className="pill">
            Your RAM <b>{pc.ram ?? '—'} GB</b>
          </span>
        </div>
      ) : null}
      <div className="m-stats">
        <div className="stat">
          <span>Repack size</span>
          <b>{fmtGb(game.sizeGb)}</b>
        </div>
        <div className="stat">
          <span>Original size</span>
          <b>{fmtGb(game.origGb)}</b>
        </div>
        <div className="stat">
          <span>Saved</span>
          <b>{saved != null ? `−${saved}%` : '—'}</b>
        </div>
      </div>
      <div className="req-cols">
        <ReqBlock title="Minimum" req={steam?.min} pc={pc} hasRig={hasRig} />
        <ReqBlock title="Recommended" req={steam?.rec} pc={pc} hasRig={hasRig} extraClass="rec" />
      </div>
      <p className="req-note">
        {steam
          ? 'Requirements from the Steam store listing.'
          : 'No Steam listing matched, so no requirements are available for this one.'}{' '}
        Cyan dot: your hardware clears it. Pink: it falls short.
      </p>
      <div className="m-actions">
        <a className="btn primary" href={game.url} target="_blank" rel="noopener noreferrer">
          Open repack page
        </a>
        {steam?.appid ? (
          <a
            className="btn ghost"
            href={`https://store.steampowered.com/app/${steam.appid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Steam page
          </a>
        ) : null}
        {steam?.appid ? (
          <a
            className="btn ghost"
            href={`https://store.steampowered.com/app/${steam.appid}/?l=english`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reviews &amp; screenshots
          </a>
        ) : null}
      </div>
    </>
  );
}

function ReqBlock({
  title,
  req,
  pc,
  hasRig,
  extraClass = '',
}: {
  title: string;
  req?: ReqBlock | null;
  pc: PcProfile;
  hasRig: boolean;
  extraClass?: string;
}) {
  if (!req) {
    return (
      <div className={`req-block ${extraClass}`}>
        <h4>{title}</h4>
        <p className="req-note">Not published for this game.</p>
      </div>
    );
  }

  const rows: [string, string, string | undefined][] = [
    ['OS', 'os', req.os],
    ['Processor', 'cpu', req.cpu],
    ['Memory', 'ram', req.ram],
    ['Graphics', 'gpu', req.gpu],
    ['DirectX', 'dx', req.dx],
    ['Storage', 'storage', req.storage],
  ];
  const comparable = new Set(['cpu', 'ram', 'gpu', 'storage']);

  return (
    <div className={`req-block ${extraClass}`}>
      <h4>{title}</h4>
      {rows
        .filter((r) => r[2])
        .map(([label, kind, val]) => {
          const st = hasRig && comparable.has(kind) ? checkField(kind, val, pc) : '';
          return (
            <div key={kind} className="req-row">
              <dt>{label}</dt>
              <dd>
                {val}
                {st ? (
                  <span
                    className={`dot ${st}`}
                    title={
                      st === 'pass' ? 'Your PC meets this' : st === 'fail' ? 'Below this' : 'Could not compare'
                    }
                  />
                ) : null}
              </dd>
            </div>
          );
        })}
      {req.notes ? <p className="req-note">{req.notes}</p> : null}
    </div>
  );
}