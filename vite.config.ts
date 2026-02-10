import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import manifest from './manifest.json';

const lucideEntry = decodeURIComponent(new URL('./node_modules/lucide/dist/esm/lucide/src/lucide.js', import.meta.url).pathname);

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      lucide: lucideEntry
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
