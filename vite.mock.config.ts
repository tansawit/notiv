import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: 'src/mocks',
  server: {
    port: 5174,
    open: true,
  },
});
