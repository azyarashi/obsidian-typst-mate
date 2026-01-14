import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { SyntaxKind, type SyntaxMode } from '@/utils/rust/crates/typst-synatx';
import type { EditorHelper } from '../../../index';
import { snippetRegex } from '../../elements/SnippetSuggest';
import { symbolRegex } from '../../elements/SymbolSuggest';
import { editorHelperFacet } from '../core/Helper';
import { type TypstParserPluginValue, typstMatePlugin } from '../core/TypstMate';
import { type ShortcutPluginValue, shortcutPlugin } from './Shortcut';

export const suggestExtension = [
  EditorView.updateListener.of((update) => {
    const helper = update.state.facet(editorHelperFacet);
    if (!helper) return;

    const sel = update.state.selection.main;

    if (update.focusChanged) {
      if (!update.view.hasFocus) helper.close();
    } else if (update.docChanged && sel.empty) {
      // Check region
      const parserData = update.view.plugin(typstMatePlugin) as unknown as TypstParserPluginValue | null;
      if (!parserData) return;

      const cursor = sel.head;
      const region = parserData.parsedRegions.find((r) => r.from <= cursor && cursor <= r.to);

      // We only suggest if in a region
      if (!region) {
        helper.hideAllSuggest();
        return;
      }

      // Check if cursor is in Raw or Str token
      const token = region.tokens.find((t) => t.from <= cursor && cursor <= t.to);
      if (
        token &&
        (token.kind === SyntaxKind.Str ||
          token.kind === SyntaxKind.Raw ||
          token.kind === SyntaxKind.RawLang ||
          token.kind === SyntaxKind.RawDelim ||
          token.kind === SyntaxKind.RawTrimmed)
      ) {
        helper.hideAllSuggest();
        return;
      }

      const mode = token?.mode ?? region.mode;

      if (trySuggest(helper, update.view, sel.head, mode)) {
        helper.inlinePreviewEl.close();
        return;
      }
      helper.hideAllSuggest();
    }
  }),
  Prec.high(
    EditorView.domEventHandlers({
      mousedown: (e, view) => {
        const helper = view.state.facet(editorHelperFacet);
        if (!helper) return;

        const plugin = view.plugin(shortcutPlugin) as unknown as ShortcutPluginValue | null;
        plugin?.clearShortcutTimeout();
        helper.hideAllSuggest();

        if (helper.inlinePreviewEl.style.display !== 'none') helper.inlinePreviewEl.onClick(e);
      },
      keydown: (e, view) => {
        const helper = view.state.facet(editorHelperFacet);
        if (!helper) return;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') helper.hideAllSuggest();
        else {
          if (helper.symbolSuggestEl.style.display !== 'none') helper.symbolSuggestEl.onKeyDown(e);
          else if (helper.snippetSuggestEl.style.display !== 'none') helper.snippetSuggestEl.onKeyDown(e);
        }
      },
    }),
  ),
];

const trySuggest = (helper: EditorHelper, view: EditorView, offset: number, mode: SyntaxMode): boolean => {
  const line = view.state.doc.lineAt(offset);
  const textBeforeCursor = line.text.slice(0, offset - line.from);

  // symbol / snippet
  if (textBeforeCursor.endsWith('@') && !textBeforeCursor.startsWith('#import')) {
    helper.symbolSuggestEl.close();

    const match = textBeforeCursor.match(snippetRegex);
    if (match) {
      if (match.groups?.query === undefined) return true;

      helper.snippetSuggestEl.suggest(view, match.groups.query, offset, match.groups.arg);
      return true;
    }

    helper.snippetSuggestEl.close();
  } else if (!helper.plugin.typstManager.beforeProcessor?.disableSuggest && !textBeforeCursor.endsWith(' ')) {
    helper.snippetSuggestEl.close();

    const match = textBeforeCursor.match(symbolRegex);
    if (match) {
      if (match.groups?.symbol === undefined) return true;

      helper.symbolSuggestEl.suggest(view, match.groups.symbol, offset, mode);
      return true;
    }
  }

  return false;
};
