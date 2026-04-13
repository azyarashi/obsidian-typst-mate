import { Keymap } from 'obsidian';
import { appUtils } from '@/libs';
import type TypstElement from '@/ui/elements/Typst';

export function executeTypstMateURI(uri: URL, event: MouseEvent, context?: TypstElement) {
  switch (uri.hostname) {
    case 'openLinkText': {
      const target = decodeURIComponent(uri.searchParams.get('linktext') ?? '');
      if (target) appUtils.app.workspace.openLinkText(target, context?.npath ?? '', Keymap.isModEvent(event));
      break;
    }
  }
}
