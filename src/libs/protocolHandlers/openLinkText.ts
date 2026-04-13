import type { ObsidianProtocolData } from 'obsidian';
import { appUtils } from '../appUtils';

interface OpenLinkTextParams extends ObsidianProtocolData {
  linktext: string;
  sourcePath: string;
  newLeaf: string;
}

export function openLinkTextProtocolHandler(params: ObsidianProtocolData) {
  const { linktext, sourcePath, newLeaf } = params as OpenLinkTextParams;

  const linktextDecoded = decodeURIComponent(linktext);
  const sourcePathDecoded = decodeURIComponent(sourcePath);
  const openNewLeaf = newLeaf === 'true';
  appUtils.app.workspace.openLinkText(linktextDecoded, sourcePathDecoded, openNewLeaf);
}
