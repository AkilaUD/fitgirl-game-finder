export const SCANNER_DOWNLOAD_FILENAME = 'FitGirlPcScanner-setup.exe';

export const BUNDLED_SCANNER_EXE = `/downloads/${SCANNER_DOWNLOAD_FILENAME}`;
export const BUNDLED_SCANNER_STATIC = BUNDLED_SCANNER_EXE;
/** GET on pair returns the installer; POST starts pairing. */
export const BUNDLED_SCANNER_API = '/api/pc-scan/pair';

export const SCANNER_EXE_GITHUB =
  'https://raw.githubusercontent.com/AkilaUD/fitgirl-game-finder/main/public/downloads/FitGirlPcScanner-setup.exe';

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
    href: SCANNER_EXE_GITHUB,
    bundled: false,
    directDownload: true,
  };
}