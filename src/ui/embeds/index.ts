import type ObsidianTypstMate from '@/main';
import { TypstEmbedComponent } from './typst';

export function registerEmbeds(plugin: ObsidianTypstMate) {
  plugin.app.embedRegistry.registerExtension(
    TypstEmbedComponent.ext,
    (ctx, file) => new TypstEmbedComponent(ctx.containerEl, file),
  );
}

export function unregisterEmbeds(plugin: ObsidianTypstMate) {
  plugin.app.embedRegistry.unregisterExtension(TypstEmbedComponent.ext);
}
