import type { Game, PcProfile } from '../../lib/gameTypes';
import { GameCard } from './GameCard';

export function RecoStrip({
  picks,
  pc,
  hasRig,
  onOpen,
}: {
  picks: Game[];
  pc: PcProfile;
  hasRig: boolean;
  onOpen: (id: number) => void;
}) {
  if (!picks.length) return null;
  return (
    <section className="reco">
      <div className="reco-head">
        <h2>Recommended for your PC</h2>
        <p className="muted">
          Meets the <strong>recommended</strong> specs and released recently.
        </p>
      </div>
      <div className="reco-strip">
        {picks.map((g, i) => (
          <GameCard key={g.id} game={g} pc={pc} hasRig={hasRig} index={i} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}