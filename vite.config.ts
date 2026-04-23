import path from 'node:path';
import builtinModules from 'builtin-modules';
import { buildSync } from 'esbuild';
import { defineConfig, type UserConfig } from 'vite';
import { json5Plugin } from 'vite-plugin-json5';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { supportedWatcherPlatforms } from './src/constants/watcher';

export default defineConfig(async ({ mode }) => {
  const prod = mode === 'production';
  const version = JSON.parse(await Bun.file('manifest.json').text()).version;

  return {
    plugins: [
      json5Plugin(),
      {
        name: 'build-watcher',
        writeBundle(options) {
          const outDir = options.dir || 'dist';
          buildSync({
            entryPoints: ['packages/watcher/src/index.ts'],
            bundle: true,
            outfile: path.join(outDir, `watcher-${version}.js`),
            platform: 'node',
            format: 'cjs',
            minify: prod,
            external: ['obsidian', 'electron', ...builtinModules],
          });
        },
      },
      viteStaticCopy({
        targets: [
          ...(prod
            ? [
                { src: `typst.wasm`, rename: `typst-${version}.wasm`, dest: '' },
                { src: 'manifest.json', rename: 'manifest.json', dest: '' },
                ...supportedWatcherPlatforms.map((platform) => ({
                  src: `node_modules/@parcel/watcher-${platform}/watcher.node`,
                  rename: `watcher-${platform}-${version}.node`,
                  dest: '',
                })),
              ]
            : []),
        ],
      }),
    ],
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['cjs'],
      },
      emptyOutDir: prod,
      minify: 'oxc',
      rolldownOptions: {
        output: {
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
          codeSplitting: false,
        },
        external: [
          'obsidian',
          'electron',
          '@codemirror/autocomplete',
          '@codemirror/collab',
          '@codemirror/commands',
          '@codemirror/language',
          '@codemirror/lint',
          '@codemirror/search',
          '@codemirror/state',
          '@codemirror/view',
          '@lezer/common',
          '@lezer/highlight',
          '@lezer/lr',
          '@excalidraw/excalidraw',
          'obsidian-excalidraw-plugin',
          '@zsviczian/excalidraw',
          ...builtinModules,
        ],
        onwarn: (warning, defaultHandler) => {
          if (warning.code !== 'FILE_NAME_CONFLICT') defaultHandler(warning);
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
  } satisfies UserConfig;
});
