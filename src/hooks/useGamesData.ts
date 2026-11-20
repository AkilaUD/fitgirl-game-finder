import { useEffect, useState } from 'react';
import type { Game, GameFacets, Suggestions } from '../lib/gameTypes';

function buildFacets(games: Game[]): GameFacets {
  const counts = new Map<string, number>();
  let yMin = 9999;
  let yMax = 0;
  for (const g of games) {
    if (g.date) {
      const y = Number(g.date.slice(0, 4));
      if (y) {
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }
    for (const t of g.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const maxSize = Math.ceil(Math.max(...games.map((g) => g.sizeGb || 0), 0));
  const genres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([tag, count]) => ({ tag, count }));
  return { yearMin: yMin === 9999 ? 2010 : yMin, yearMax: yMax || new Date().getFullYear(), maxSize, genres };
}

export function useGamesData() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [facets, setFacets] = useState<GameFacets | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions>({ gpus: [], cpus: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/data/games.json');
        const data = await r.json();
        if (cancelled) return;
        const list: Game[] = data.games || data;
        list.forEach((g, i) => {
          g.id = i;
        });
        setGames(list);
        setFacets(buildFacets(list));
      } catch {
        if (!cancelled) {
          setError('Could not load data/games.json — run through a dev server or deploy with public/data.');
        }
      }
    })();
    (async () => {
      try {
        const r = await fetch('/data/suggestions.json');
        if (!r.ok) return;
        const s = await r.json();
        if (!cancelled) setSuggestions({ gpus: s.gpus || [], cpus: s.cpus || [] });
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { games, facets, suggestions, error, loading: games === null && !error };
}