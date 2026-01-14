import {
  CSSClass,
  highlight,
  type SyntaxKind,
  type SyntaxNode,
  type SyntaxToken,
  TypstParser,
} from '@/utils/rust/crates/typst-synatx';

export function TypstCode(source: string, el: HTMLElement, kind: SyntaxKind) {
  el.empty();
  const pre = el.createEl('pre');
  const codeEl = pre.createEl('code');

  const parser = new TypstParser(source, kind);
  const root = parser.parse();

  if (!root) {
    codeEl.setText(source);
    return;
  }

  const styles = new Array(source.length).fill(0).map(() => new Set<string>());
  const traverse = (
    node: SyntaxNode | SyntaxToken,
    parent: SyntaxNode | null,
    index: number,
    siblings: (SyntaxNode | SyntaxToken)[],
  ) => {
    const cls = highlight(node, parent, index, siblings) ?? CSSClass.Text;
    if (cls) {
      for (let i = node.from; i < node.to; i++) {
        if (i >= 0 && i < styles.length) styles[i]!.add(cls);
      }
    }

    if ('children' in node && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i]!, node, i, node.children);
      }
    }
  };

  traverse(root, null, 0, []);

  let lastCls = '';
  let textBuffer = '';

  for (let i = 0; i < source.length; i++) {
    const cls = Array.from(styles[i]!).sort().join(' ');
    if (cls !== lastCls) {
      if (textBuffer) codeEl.createSpan({ cls: lastCls, text: textBuffer });
      textBuffer = '';
      lastCls = cls;
    }
    textBuffer += source[i];
  }
  if (textBuffer) codeEl.createSpan({ cls: lastCls, text: textBuffer });
}
