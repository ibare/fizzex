import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      fizzex: resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
});
