import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { buildInstructions } from './src/instructions/buildInstructions.mjs';
import { buildPwa, developmentHeader } from './src/pwa/buildPwa.mjs';

export default defineConfig({
  plugins: [react(), buildInstructions(), buildPwa(), developmentHeader()],
  build: {
    outDir: 'build',
    // Use a conservative syntax target for the existing app, including Safari.
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    environmentOptions: { jsdom: { url: 'http://localhost:3000/' } },
  },
});
