// Vite (docs/infraestructura.md §2, §6). En DEV reenvía /api a la API sin
// cambiar Origin (API_PROXY_TARGET, sin prefijo VITE_ para que no llegue al bundle).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false, assetsDir: 'assets' },
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: false, ws: false },
    },
  },
});
