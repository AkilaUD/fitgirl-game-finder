import type { Game, PcProfile } from '../../lib/gameTypes';
import { GameCard } from './GameCard';

export function GameGrid({
  games,
  pc,
  hasRig,
  onOpen,
}: {
  games: Game[];
  pc: PcProfile;
  hasRig: boolean;
  onOpen: (id: number) => void;
}) {
  return (
    <div className="grid">
      {games.map((g, i) => (
        <GameCard key={g.id} game={g} pc={pc} hasRig={hasRig} index={i} onOpen={onOpen} />
      ))}
    </div>
  );
}