import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';

declare module '@codemirror/lint' {
  type LintSource = (view: EditorView) => readonly Diagnostic[] | Promise<readonly Diagnostic[]>;
  declare function linter(source: LintSource | null, config?: LintConfig): Extension;
}
