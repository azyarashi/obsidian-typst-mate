import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { buildSimpleEditorExtensions } from './index';

export function buildJSSimpleEditorExtensions() {
  return [
    ...buildSimpleEditorExtensions({
      language: [javascript(), syntaxHighlighting(defaultHighlightStyle, { fallback: true })].filter((ext) => ext),
    }),
  ];
}
