import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { persistTheme, readStoredTheme, type SiteThemeId } from '../lib/siteTheme';

interface ThemeContextValue {
  theme: SiteThemeId;
  setTheme: (id: SiteThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteThemeId>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  const setTheme = (id: SiteThemeId) => setThemeState(id);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useSiteTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useSiteTheme must be used within ThemeProvider');
  return ctx;
}