import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { PORTS } from '../scripts/ports.mjs';

// Ports are derived deterministically from the project name (scripts/ports.mjs),
// so this repo never collides with others on 5173/3000. Override with env if needed.
const serverPort = Number(process.env.SERVER_PORT ?? PORTS.server);
const clientPort = Number(process.env.CLIENT_PORT ?? PORTS.client);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve the workspace package to its TS source. Its CommonJS dist uses
      // `export *` / defineProperty patterns that Rollup can't statically analyze
      // for named runtime imports; compiling the source directly avoids that.
      '@contractor-cfo/shared': fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: clientPort,
    strictPort: true, // fail loudly on a collision instead of silently drifting
    proxy: {
      // 127.0.0.1, not localhost: avoids Node's dual-stack (Happy Eyeballs)
      // connection racing, which can throw spurious EAGAIN errors here.
      '/api': `http://127.0.0.1:${serverPort}`,
    },
    // Reached remotely via the cfo.iandmiller.com Cloudflare Tunnel.
    allowedHosts: ['cfo.iandmiller.com'],
  },
});
