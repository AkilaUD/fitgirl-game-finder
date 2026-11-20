# FitGirl PC Scanner installer

The website serves downloads from this folder:

- **`FitGirlPcScanner-portable.zip`** — default (no Rust required). Run `npm run scanner:pack-portable` to rebuild.
- **`FitGirlPcScanner-setup.exe`** — optional Tauri installer after `npm run scanner:build`.

## Create / refresh the file

1. Build the scanner (Windows, Rust required):

   ```bash
   cd scanner
   npm install
   npm run tauri build
   ```

2. Copy the NSIS `.exe` into this folder:

   ```bash
   cd ..
   npm run scanner:copy-download
   ```

3. Commit `FitGirlPcScanner-setup.exe` if you want Vercel to host the direct download (file is ~5–15 MB).

The scan wizard uses this path by default; override with `VITE_SCANNER_DOWNLOAD_URL` only for an external CDN or GitHub Release asset.