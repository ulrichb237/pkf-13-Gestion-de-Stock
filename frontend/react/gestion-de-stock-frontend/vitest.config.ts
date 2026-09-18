import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Miroir de vite.config.ts : vitest.config.ts n'herite pas de vite.config.ts,
  // l'alias '@' doit donc etre redeclare ici (Task 3 — risque nomme de l'alias).
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    css: { include: [/\?raw$/] },
  },
});
