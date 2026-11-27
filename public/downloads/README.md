# FitGirl PC Scanner installer

Default download: **`FitGirlPcScanner-setup.exe`** — one Windows executable (PowerShell payload embedded).

## Rebuild

```bash
npm run scanner:build-exe
```

Requires Windows and .NET Framework `csc` (included on Windows). Commits the `.exe` to this folder and refreshes `server/lib/scannerZip.js` for `GET /api/pc-scan/pair`.

Optional Tauri UI build: `npm run scanner:build` (Rust required).