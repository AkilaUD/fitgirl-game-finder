import { SITE_THEMES, type SiteThemeId } from './siteTheme';

/** Three.js / static fallback — call `paletteForTheme` when theme changes. */
export function paletteForTheme(id: SiteThemeId) {
  return SITE_THEMES[id];
}