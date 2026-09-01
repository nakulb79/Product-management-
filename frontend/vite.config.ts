/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  if (command === 'build' && !env.VITE_API_BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL is not set. A production build would silently point at http://localhost:5000/api. ' +
        'Set it in .env.production (or your CI/deploy environment) before running `vite build`.'
    );
  }

  return {
    plugins: [react()],
    server: {
      port: 5173
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      globals: true,
      // The default `forks` pool hangs on this Windows setup (worker never
      // reports ready); `threads` runs reliably here.
      pool: 'threads'
    }
  };
});
