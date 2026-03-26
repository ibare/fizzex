/**
 * Fizzex browser bundle build configuration
 *
 * IIFE bundle for use in Playwright for print/PDF rendering
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/export/index.ts'),
      name: 'FizzexExport',
      formats: ['iife'],
      fileName: () => 'fizzex-export.js',
    },
    outDir: 'dist/browser',
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      fizzex: resolve(__dirname, 'src'),
    },
  },
});
