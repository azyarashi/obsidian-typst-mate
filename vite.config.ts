import fs from 'node:fs';
import path from 'node:path';

import builtinModules from 'builtin-modules';
import { defineConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(async ({ mode }) => {
  const prod = mode === 'production';
  const version = JSON.parse(await Bun.file('manifest.json').text()).version;

  return {
    plugins: [
      tsconfigPaths(),
      viteStaticCopy({
        targets: prod
          ? [
              { src: `typst.wasm`, rename: `typst-${version}.wasm`, dest: '' },
              { src: 'manifest.json', rename: 'manifest.json', dest: '' },
            ]
          : [],
      }),
      {
        name: 'prepend-style-settings',
        apply: 'build',
        enforce: 'post',
        buildStart() {
          this.addWatchFile(path.resolve(__dirname, 'src/plugins/style-settings.css'));
        },
        generateBundle(_, bundle) {
          const styleSettings = fs.readFileSync('src/plugins/style-settings.css', 'utf-8');
          const styleAsset = bundle['styles.css'];
          if (styleAsset.type === 'asset') styleAsset.source = `${styleSettings}${styleAsset.source}`;
        },
      },
    ],
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['cjs'],
      },
      emptyOutDir: prod,
      minify: 'oxc',
      rollupOptions: {
        output: {
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
          inlineDynamicImports: true,
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
          'i18next',
          'obsidian-excalidraw-plugin',
          '@zsviczian/excalidraw',
          ...builtinModules,
        ],
      },
    },
  } as UserConfig;
});
