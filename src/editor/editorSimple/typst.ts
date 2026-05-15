import type { Extension } from '@codemirror/state';
import { obsidianTheme, typstSyntaxHighlighting, typstTextCore } from '@/editor';
import { buildSimpleEditorExtensions } from './index';

export function buildTypstSimpleEditorExtensions(): Extension[] {
  return [typstTextCore, obsidianTheme, ...buildSimpleEditorExtensions({ language: typstSyntaxHighlighting() })];
}
