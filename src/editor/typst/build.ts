import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightTrailingWhitespace,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { diagnosticsState } from '@/editor/shared/extensions/Diagnostic';
import { extensionManager, viewTracker } from '@/libs/extensionManager';
import { typstTextCore } from './extensions/TypstCore';

export function buildTypstTextExtensions() {
  const extensions: Extension[] = [
    typstTextCore,

    EditorView.lineWrapping,

    history(),
    search(),
    closeBrackets(),
    highlightSelectionMatches({ minSelectionLength: 2 }),

    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      { key: 'Tab', run: indentMore },
      { key: 'Shift-Tab', run: indentLess },

      ...standardKeymap,
    ]),

    // Diagnostics state (always-on, required by linterExtension)
    diagnosticsState,

    highlightTrailingWhitespace(),

    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    viewTracker('typst'),

    // Managed extensions (Compartment-wrapped, includes linter & syntax highlight)
    ...extensionManager.buildExtensions('typst'),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
