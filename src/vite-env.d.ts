/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCANNER_DOWNLOAD_URL?: string;
  readonly VITE_PC_SCAN_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Navigator {
  readonly deviceMemory?: number;
  readonly userAgentData?: { platform?: string };
  readonly gpu?: GPU;
}