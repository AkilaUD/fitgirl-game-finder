/** Portable zip (always in repo). Full NSIS installer uses FitGirlPcScanner-setup.exe when built. */
export const SCANNER_DOWNLOAD_FILENAME = 'FitGirlPcScanner-portable.zip';

export const BUNDLED_SCANNER_EXE = '/downloads/FitGirlPcScanner-setup.exe';
/** Static path (Vite `public/`); Vercel may also serve via `/api/scanner-download`. */
export const BUNDLED_SCANNER_STATIC = `/downloads/${SCANNER_DOWNLOAD_FILENAME}`;
export const BUNDLED_SCANNER_API = '/api/scanner-download';

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
    href: BUNDLED_SCANNER_API,
    bundled: true,
    directDownload: true,
  };
}