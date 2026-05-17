import { Keymap } from 'obsidian';
import type TypstElement from '@/managers/rendererManager/elements/Typst';

export function handleTypstMateURI(uri: URL, event: MouseEvent, context?: TypstElement): boolean | URL {
  switch (uri.hostname) {
    case 'openLinkText': {
      uri.searchParams.set('sourcePath', context?.npath ?? '');
      uri.searchParams.set('newLeaf', Keymap.isModEvent(event) ? 'true' : 'false');
      return uri;
    }
  }

  return false;
}
