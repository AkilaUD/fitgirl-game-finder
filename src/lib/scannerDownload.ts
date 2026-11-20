/** Portable zip (always in repo). Full NSIS installer uses FitGirlPcScanner-setup.exe when built. */
export const SCANNER_DOWNLOAD_FILENAME = 'FitGirlPcScanner-portable.zip';

export const BUNDLED_SCANNER_EXE = '/downloads/FitGirlPcScanner-setup.exe';
/** Static path (Vite `public/`); Vercel may also serve via `/api/scanner-download`. */
export const BUNDLED_SCANNER_STATIC = `/downloads/${SCANNER_DOWNLOAD_FILENAME}`;
/** GET on the pair route returns the portable scanner zip; POST starts pairing. */
export const BUNDLED_SCANNER_API = '/api/pc-scan/pair';

/** Same file in git — works when Vercel static/API deploy is behind. */
export const SCANNER_ZIP_GITHUB =
  'https://raw.githubusercontent.com/AkilaUD/fitgirl-game-finder/main/public/downloads/FitGirlPcScanner-portable.zip';

export interface ScannerDownloadLink {
  href: string;
  /** Same-origin file in the repo / on Vercel static hosting */
  bundled: boolean;
  /** Use native download attribute (direct save, not a new tab) */
  directDownload: boolean;
}

export function resolveScannerDownload(): ScannerDownloadLink {
  const override = import.meta.env.VITE_SCANNER_DOWNLOAD_URL?.trim();
  if (override) {
    const bundled = override.startsWith('/');
    const directDownload =
      bundled || /\.(exe|msi|zip)(\?|$)/i.test(override) || override.includes('/downloads/');
    return { href: override, bundled, directDownload };
  }
  return {
    href: SCANNER_ZIP_GITHUB,
    bundled: false,
    directDownload: false,
  };
}