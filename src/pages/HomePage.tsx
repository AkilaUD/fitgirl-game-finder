import { useCallback, useEffect, useState } from 'react';
import type { CompatFilter, FilterState, SortKey } from '../lib/gameTypes';
import { useGamesData } from '../hooks/useGamesData';
import { useRig } from '../hooks/useRig';
import { useFilteredGames, useRecoPicks } from '../hooks/useFilteredGames';
import { HeaderBar } from '../components/header/HeaderBar';
import { RigPanel } from '../components/rig/RigPanel';
import { FilterSidebar } from '../components/filters/FilterSidebar';
import { GameGrid } from '../components/games/GameGrid';
import { RecoStrip } from '../components/games/RecoStrip';
import { GameModal } from '../components/games/GameModal';
import { Footer } from '../components/layout/Footer';
import { useHomeEntrance } from '../hooks/useHomeEntrance';

function defaultFilter(facets: { yearMin: number; yearMax: number; maxSize: number }): FilterState {
  return {
    q: '',
    sizeMin: 0,
    sizeMax: facets.maxSize,
    yearMin: facets.yearMin,
    yearMax: facets.yearMax,
    genres: new Set(),
    compat: 'any',
    sort: 'new',
    limit: 60,
  };
}

export function HomePage() {
  const { games, facets, suggestions, error, loading } = useGamesData();
  const rig = useRig();
  const [filter, setFilter] = useState<FilterState | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rigFlash, setRigFlash] = useState(false);

  useEffect(() => {
    if (facets && !filter) setFilter(defaultFilter(facets));
  }, [facets, filter]);

  const patchFilter = useCallback((patch: Partial<FilterState>) => {
    setFilter((f) => (f ? { ...f, ...patch } : f));
  }, []);

  const { filtered } = useFilteredGames(games, filter ?? emptyFilter(), rig.pcProfile, rig.hasRig);
  const visible = filtered.slice(0, filter?.limit ?? 60);
  const reco = useRecoPicks(filtered, rig.pcProfile, rig.hasRig);

  const selected = selectedId != null ? games?.find((g) => g.id === selectedId) ?? null : null;

  const flashRig = () => {
    document.getElementById('rig')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setRigFlash(true);
    window.setTimeout(() => setRigFlash(false), 1200);
  };

  const onCompat = (v: CompatFilter) => {
    if (!rig.hasRig && v !== 'any') {
      flashRig();
      return;
    }
    patchFilter({ compat: v, limit: 60 });
  };

  const onGenreToggle = (tag: string) => {
    if (!filter) return;
    const genres = new Set(filter.genres);
    if (genres.has(tag)) genres.delete(tag);
    else genres.add(tag);
    patchFilter({ genres, limit: 60 });
  };

  const onReset = () => {
    if (!facets) return;
    setFilter(defaultFilter(facets));
  };

  const onScan = () => rig.runScan();
  const entranceReady = !loading && !error && filter != null && facets != null;
  const entranceRef = useHomeEntrance(entranceReady);

  return (
    <div ref={entranceRef} className="home-entrance">
      <HeaderBar
        query={filter?.q ?? ''}
        onQuery={(q) => patchFilter({ q, limit: 60 })}
        onScan={onScan}
        scanning={rig.scanning}
      />
      <RigPanel
        rig={rig}
        games={games}
        gpuSuggestions={suggestions.gpus}
        cpuSuggestions={suggestions.cpus}
        onScan={onScan}
        flash={rigFlash}
      />
      {loading ? (
        <main className="layout" id="main">
          <p className="count muted">Loading…</p>
        </main>
      ) : error ? (
        <main className="layout" id="main">
          <p className="count muted">{error}</p>
        </main>
      ) : filter && facets ? (
        <main className="layout" id="main">
          <FilterSidebar
            filter={filter}
            facets={facets}
            onChange={patchFilter}
            onReset={onReset}
            onCompat={onCompat}
            onGenreToggle={onGenreToggle}
            onSizePreset={(min, max) => patchFilter({ sizeMin: min, sizeMax: max, limit: 60 })}
          />
          <section className="results">
            <div className="results-head">
              <p className="count">
                <strong>{filtered.length.toLocaleString()}</strong> repack{filtered.length === 1 ? '' : 's'}
                {rig.hasRig && filter.compat !== 'any' ? ' matching your PC' : ''} · {games?.length.toLocaleString()}{' '}
                total
              </p>
              <div className="sortwrap">
                <label className="field inline">
                  <span>Sort</span>
                  <select
                    value={filter.sort}
                    onChange={(e) => patchFilter({ sort: e.target.value as SortKey })}
                  >
                    <option value="new">Newest first</option>
                    <option value="small">Smallest download</option>
                    <option value="large">Largest download</option>
                    <option value="fit">Best fit for my PC</option>
                  </select>
                </label>
              </div>
            </div>
            {reco.length ? (
              <RecoStrip picks={reco} pc={rig.pcProfile} hasRig={rig.hasRig} onOpen={setSelectedId} />
            ) : null}
            <GameGrid games={visible} pc={rig.pcProfile} hasRig={rig.hasRig} onOpen={setSelectedId} />
            {filtered.length > (filter.limit ?? 60) ? (
              <div className="more-wrap">
                <button type="button" className="btn ghost wide" onClick={() => patchFilter({ limit: filter.limit + 60 })}>
                  Load more ({Math.max(0, filtered.length - filter.limit).toLocaleString()} left)
                </button>
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <p className="empty">Nothing matches those filters. Widen the size or date range.</p>
            ) : null}
          </section>
        </main>
      ) : null}
      <Footer />
      <GameModal game={selected} pc={rig.pcProfile} hasRig={rig.hasRig} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function emptyFilter(): FilterState {
  return {
    q: '',
    sizeMin: 0,
    sizeMax: 200,
    yearMin: 2010,
    yearMax: new Date().getFullYear(),
    genres: new Set(),
    compat: 'any',
    sort: 'new',
    limit: 60,
  };
}