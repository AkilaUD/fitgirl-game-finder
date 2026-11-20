import { useMemo } from 'react';
import type { FilterState, Game, PcProfile } from '../lib/gameTypes';
import { predict } from '../lib/predict';

export function useFilteredGames(
  games: Game[] | null,
  filter: FilterState,
  pc: PcProfile,
  hasRig: boolean,
) {
  return useMemo(() => {
    if (!games) return { filtered: [] as Game[], total: 0 };

    const q = filter.q.trim().toLowerCase();
    const filtered = games.filter((g) => {
      if (filter.q && !(`${g.title} ${(g.tags || []).join(' ')} ${g.companies || ''}`.toLowerCase().includes(q))) {
        return false;
      }
      if (g.sizeGb == null || g.sizeGb < filter.sizeMin || g.sizeGb > filter.sizeMax) return false;
      const y = g.date ? Number(g.date.slice(0, 4)) : null;
      if (y && (y < filter.yearMin || y > filter.yearMax)) return false;
      if (filter.genres.size) {
        const tags = (g.tags || []).map((t) => t.toLowerCase());
        let ok = false;
        for (const want of filter.genres) {
          if (tags.includes(want.toLowerCase())) {
            ok = true;
            break;
          }
        }
        if (!ok) return false;
      }
      if (filter.compat !== 'any') {
        if (!hasRig) return true;
        const v = predict(g, pc).verdict;
        if (filter.compat === 'rec' && v !== 'rec') return false;
        if (filter.compat === 'min' && v !== 'rec' && v !== 'min') return false;
      }
      return true;
    });

    const sort = filter.sort;
    filtered.sort((a, b) => {
      if (sort === 'small') return (a.sizeGb || 0) - (b.sizeGb || 0);
      if (sort === 'large') return (b.sizeGb || 0) - (a.sizeGb || 0);
      if (sort === 'fit' && hasRig) {
        const rank: Record<string, number> = { rec: 0, min: 1, unknown: 2, below: 3, nodata: 4 };
        const ra = rank[predict(a, pc).verdict] ?? 3;
        const rb = rank[predict(b, pc).verdict] ?? 3;
        if (ra !== rb) return ra - rb;
        return (b.date || '').localeCompare(a.date || '');
      }
      return (b.date || '').localeCompare(a.date || '');
    });

    return { filtered, total: filtered.length };
  }, [games, filter, pc, hasRig]);
}

export function useRecoPicks(filtered: Game[], pc: PcProfile, hasRig: boolean) {
  return useMemo(() => {
    if (!hasRig || !pc.gpuScore) return [];
    return filtered
      .filter((g) => g.steam && predict(g, pc).verdict === 'rec')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8);
  }, [filtered, pc, hasRig]);
}