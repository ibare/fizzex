import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizersPlugin } from './vite.plugin.visualizers';

export default defineConfig({
  plugins: [react(), visualizersPlugin()],
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
