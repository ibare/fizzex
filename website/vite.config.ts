import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/fizzex/',
  resolve: {
    alias: {
      fizzex: resolve(__dirname, '../src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
