import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

// Resolve the @layer/* path aliases (kept in sync with tsconfig.json "paths").
// esbuild's native `alias` does not support wildcards, so a tiny resolver plugin
// rewrites '@layer/rest' to the matching folder under src/app.
const aliases = {
  '@domain': resolve(root, 'src/app/domain'),
  '@application': resolve(root, 'src/app/application'),
  '@infrastructure': resolve(root, 'src/app/infrastructure'),
  '@presentation': resolve(root, 'src/app/presentation'),
  '@shared': resolve(root, 'src/app/shared'),
};

const aliasPlugin = {
  name: 'layer-aliases',
  setup(build) {
    const filter = /^@(domain|application|infrastructure|presentation|shared)\//;
    build.onResolve({ filter }, (args) => {
      const slash = args.path.indexOf('/');
      const prefix = args.path.slice(0, slash);
      const rest = args.path.slice(slash + 1);
      return { path: `${resolve(aliases[prefix], rest)}.ts` };
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // VS Code loads the extension with require() → CommonJS format.
  format: 'cjs',
  platform: 'node',
  target: 'node26',
  // 'vscode' is provided by the host at runtime; it is never bundled.
  external: ['vscode'],
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
  plugins: [aliasPlugin],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('esbuild: watching for changes...');
} else {
  await esbuild.build(options);
  console.log('esbuild: build complete → dist/extension.js');
}
