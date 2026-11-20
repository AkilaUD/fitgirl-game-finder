import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Local dev middleware — .mjs has no TS types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { vitePcScanPlugin } from './scripts/vitePcScanPlugin.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), vitePcScanPlugin(env)],
    publicDir: 'public',
    server: {
      port: 5173,
      proxy: {
        '/api/system': 'http://127.0.0.1:5180',
        '/api/contact': 'http://127.0.0.1:5180',
      },
    },
  };
});