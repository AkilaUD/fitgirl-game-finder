import type { CompatFilter, FilterState, GameFacets } from '../../lib/gameTypes';

interface FilterSidebarProps {
  filter: FilterState;
  facets: GameFacets;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  onCompat: (v: CompatFilter) => void;
  onGenreToggle: (tag: string) => void;
  onSizePreset: (min: number, max: number) => void;
}

export function FilterSidebar({
  filter,
  facets,
  onChange,
  onReset,
  onCompat,
  onGenreToggle,
  onSizePreset,
}: FilterSidebarProps) {
  const years: number[] = [];
  for (let y = facets.yearMax; y >= facets.yearMin; y--) years.push(y);

  return (
    <aside className="filters" id="filters">
      <div className="fgroup">
        <h3>Download size</h3>
        <div className="dual">
          <label className="field">
            <span>Min GB</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={filter.sizeMin}
              onChange={(e) => onChange({ sizeMin: Number(e.target.value) || 0, limit: 60 })}
            />
          </label>
          <label className="field">
            <span>Max GB</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={filter.sizeMax}
              onChange={(e) => onChange({ sizeMax: Number(e.target.value) || facets.maxSize, limit: 60 })}
            />
          </label>
        </div>
        <div className="chips">
          <button type="button" className="chip" onClick={() => onSizePreset(0, 5)}>
            Under 5 GB
          </button>
          <button type="button" className="chip" onClick={() => onSizePreset(0, 15)}>
            Under 15 GB
          </button>
          <button type="button" className="chip" onClick={() => onSizePreset(5, 30)}>
            5–30 GB
          </button>
          <button type="button" className="chip" onClick={() => onSizePreset(30, filter.sizeMax)}>
            30 GB+
          </button>
        </div>
      </div>

      <div className="fgroup">
        <h3>Release date</h3>
        <div className="dual">
          <label className="field">
            <span>From</span>
            <select
              value={filter.yearMin}
              onChange={(e) => onChange({ yearMin: Number(e.target.value), limit: 60 })}
            >
              {years.map((y) => (
                <option key={`min-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>To</span>
            <select
              value={filter.yearMax}
              onChange={(e) => onChange({ yearMax: Number(e.target.value), limit: 60 })}
            >
              {years.map((y) => (
                <option key={`max-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="fgroup">
        <h3>Your PC can run it</h3>
        <div className="segment">
          {(['any', 'min', 'rec'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={filter.compat === v ? 'on' : ''}
              onClick={() => onCompat(v)}
            >
              {v === 'any' ? 'Any' : v === 'min' ? 'Min' : 'Recommended'}
            </button>
          ))}
        </div>
      </div>

      <div className="fgroup">
        <h3>Genre / tag</h3>
        <div className="chips scroll">
          {facets.genres.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              className={`chip${filter.genres.has(tag) ? ' on' : ''}`}
              onClick={() => onGenreToggle(tag)}
            >
              {tag} <span className="muted">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn ghost wide" onClick={onReset}>
        Clear filters
      </button>
    </aside>
  );
}