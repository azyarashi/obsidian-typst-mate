import type ObsidianTypstMate from '@/main';
import { openLinkTextProtocolHandler } from './openLinkText';
import { reloadTypstmateProtocolHandler } from './reloadTypstmate';

export function registerProtocolHandlers(plugin: ObsidianTypstMate) {
  plugin.registerObsidianProtocolHandler('openLinkText', openLinkTextProtocolHandler);
  plugin.registerObsidianProtocolHandler('reload-typstmate', reloadTypstmateProtocolHandler);
}
