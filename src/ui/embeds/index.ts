import type ObsidianTypstMate from '@/main';
import { TypstEmbedComponent } from './typst';

export function registerEmbeds(plugin: ObsidianTypstMate) {
  plugin.app.embedRegistry.registerExtension('typ', (ctx, file) => new TypstEmbedComponent(ctx.containerEl, file));
}
