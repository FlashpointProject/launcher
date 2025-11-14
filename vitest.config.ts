import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/vitest-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@back': path.resolve(__dirname, './src/back'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
});
