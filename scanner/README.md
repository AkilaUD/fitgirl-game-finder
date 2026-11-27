# Game Finder PC Scanner

Windows desktop companion for [Game Finder](../README.md). Collects hardware via WMI/CIM and uploads a signed-off report to the website pairing API.

## Prerequisites

- Windows 10 or 11
- [Rust](https://rustup.rs/) stable
- Node.js 20+
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Visual Studio C++ build tools, WebView2)

## Development

```bash
cd scanner
npm install
npm run tauri dev
```

Set the API base URL in the UI (default: `https://fitgirl-game-finder.vercel.app` or `http://127.0.0.1:5180` for local testing).

## Release build

```bash
npm run tauri build
```

Artifacts appear under `src-tauri/target/release/bundle/`. Upload the NSIS/MSI installer to GitHub Releases and point `VITE_SCANNER_DOWNLOAD_URL` at the asset.

## Code signing (recommended)

```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /f YourCert.pfx /p YourPassword "path\to\FitGirlPcScanner-setup.exe"
```

## Privacy

Hardware is collected locally. Nothing is sent until you click **Send report to website** with a valid pairing code.