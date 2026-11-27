export type SiteThemeId = 'cyber' | 'neon';

export const THEME_STORAGE_KEY = 'rf.theme';

export const SITE_THEMES: Record<
  SiteThemeId,
  { label: string; pink: string; pink2: string; cyan: string; ice: string; magenta: string; black: string; bg: string }
> = {
  cyber: {
    label: 'Cyber',
    pink: '#F72585',
    pink2: '#FF5CA2',
    cyan: '#00FFEA',
    ice: '#7DF9FF',
    magenta: '#B5179E',
    black: '#070509',
    bg: '#0B0810',
  },
  neon: {
    label: 'Neon',
    pink: '#7CFC00',
    pink2: '#66FF00',
    cyan: '#B8FF5C',
    ice: '#E8FFE8',
    magenta: '#4BC200',
    black: '#0E1111',
    bg: '#0E1111',
  },
};

export function readStoredTheme(): SiteThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'neon' || v === 'cyber') return v;
  } catch {
    /* ignore */
  }
  return 'cyber';
}

export function persistTheme(id: SiteThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}