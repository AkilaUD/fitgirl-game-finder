import { SITE_THEMES, type SiteThemeId } from '../../lib/siteTheme';
import { useSiteTheme } from '../../context/ThemeContext';

const ORDER: SiteThemeId[] = ['cyber', 'neon'];

export function ThemeSwitcher() {
  const { theme, setTheme } = useSiteTheme();

  return (
    <div className="theme-toggle" title="Color theme">
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={theme === id ? 'on' : ''}
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
        >
          {SITE_THEMES[id].label}
        </button>
      ))}
    </div>
  );
}