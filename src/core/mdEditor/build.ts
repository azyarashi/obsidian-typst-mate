import { type Extension, Prec } from '@codemirror/state';

import type { EditorHelper } from '.';
import { createShortcutKeymap } from './extensions/actions/shortcut';
import { createSuggestKeymap } from './extensions/actions/suggest';
import { createTabJumpKeymap } from './extensions/actions/tabjump';
import {
  createDiagnosticExtension,
  diagnosticsState,
  diagnosticsStateEffect,
} from './extensions/decorations/diagnostic';
import { createSyntaxHighlightExtension } from './extensions/decorations/syntaxHighlight';
import { typstTheme } from './extensions/decorations/theme';
import { createFocusExtension } from './extensions/others/focus';
import { createMathStateExtension } from './extensions/others/math';
import { createAutocompleteExtension } from './extensions/suggests/autocomplete';
import { createSnippetSuggestExtension } from './extensions/suggests/snippet';
import { createInlinePreviewExtension } from './extensions/tooltips/inlinePreview';

export function buildExtension(editorHelper: EditorHelper) {
  const { settings } = editorHelper.plugin;

  const mathState = createMathStateExtension(editorHelper);

  // @ts-expect-error
  const getMathObject = () => (editorHelper.editor ? editorHelper.editor.cm.state.field(mathState)! : null);
  console.log(getMathObject);

  const extensions: Extension[] = [
    // Actions
    Prec.highest(createSuggestKeymap(editorHelper, getMathObject)),
    settings.enableTabJump ? Prec.highest(createTabJumpKeymap(editorHelper, getMathObject)) : [],
    settings.enableShortcutKeys ? Prec.highest(createShortcutKeymap(editorHelper, getMathObject)) : [],

    // States
    mathState,

    // Decorations
    typstTheme,
    settings.enableSyntaxHighlight ? createSyntaxHighlightExtension(editorHelper, getMathObject) : [],
    settings.enableDiagnostic ? [diagnosticsState, createDiagnosticExtension(editorHelper, getMathObject)] : [],

    // Suggests
    /* settings.enableSnippets ? createSnippetSuggestExtension(editorHelper) : [],
    settings.enableAutocomplete ? createAutocompleteExtension(editorHelper) : [], */

    // Tooltips
    settings.enableInlinePreview ? createInlinePreviewExtension(editorHelper, getMathObject) : [],

    // Others
    createFocusExtension(editorHelper),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
