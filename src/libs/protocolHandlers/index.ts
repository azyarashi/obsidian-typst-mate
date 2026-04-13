import type ObsidianTypstMate from '@/main';
import { openLinkTextProtocolHandler } from './openLinkText';

export function registerProtocolHandlers(plugin: ObsidianTypstMate) {
  plugin.registerObsidianProtocolHandler('openLinkText', openLinkTextProtocolHandler);
}
