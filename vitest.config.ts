import { defineConfig } from 'vitest/config';

const layer = (name: string): string => new URL(`./src/app/${name}`, import.meta.url).pathname;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit tests only by default (fast, no git needed).
    include: ['test/domain/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      // 'vscode' doesn't exist outside the VS Code runtime: point it to a stub
      // so the layers that drag it in via imports can be tested.
      vscode: new URL('./test/stubs/vscode.ts', import.meta.url).pathname,
      // Layer aliases (kept in sync with tsconfig.json "paths").
      '@domain': layer('domain'),
      '@application': layer('application'),
      '@infrastructure': layer('infrastructure'),
      '@presentation': layer('presentation'),
      '@shared': layer('shared'),
    },
  },
});
