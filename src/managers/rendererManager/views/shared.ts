import type ObsidianTypstMate from '@/main';

export function registerCodeblockProcessor(plugin: ObsidianTypstMate) {
  plugin.registerMarkdownCodeBlockProcessor('csv', (_source, _el, ctx) => {
    ctx.sourcePath;
  });
}
