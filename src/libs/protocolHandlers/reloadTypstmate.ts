import type { ObsidianProtocolData } from 'obsidian';
import { appUtils } from '../appUtils';

export function reloadTypstmateProtocolHandler(_: ObsidianProtocolData) {
  appUtils.reloadPlugin(true);
}
