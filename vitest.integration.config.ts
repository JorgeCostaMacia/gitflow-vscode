import { defineConfig } from 'vitest/config';

const layer = (name: string): string => new URL(`./src/app/${name}`, import.meta.url).pathname;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    // Integration tests run real git sequentially against temp repos.
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      vscode: new URL('./test/stubs/vscode.ts', import.meta.url).pathname,
      '@domain': layer('domain'),
      '@application': layer('application'),
      '@infrastructure': layer('infrastructure'),
      '@presentation': layer('presentation'),
      '@shared': layer('shared'),
    },
  },
});
