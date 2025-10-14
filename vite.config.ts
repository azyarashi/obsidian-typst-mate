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
    ],
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['cjs'],
      },
      emptyOutDir: prod,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          entryFileNames: 'main.js',
          assetFileNames: 'styles.css',
          inlineDynamicImports: true,
        },
        external: [
          'obsidian',

          'electron',
          'i18next',

          '@codemirror/autocomplete',
          '@codemirror/commands',
          '@codemirror/lint',
          '@codemirror/merge',
          '@codemirror/search',
          '@codemirror/state',
          '@codemirror/view',

          '@excalidraw/excalidraw',
          'obsidian-excalidraw-plugin',
          '@zsviczian/excalidraw',
          ...builtinModules,
        ],
      },
    },
  } as UserConfig;
});
