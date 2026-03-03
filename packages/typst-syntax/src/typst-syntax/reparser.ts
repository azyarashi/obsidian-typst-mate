import { SyntaxKind } from './kind';
import { NumberingError, type SyntaxNode } from './node';
import { parse, parseCode, parseMath, reparseBlock, reparseMarkup } from './parser';
import { Span } from './span';

export function reparse(
  root: SyntaxNode,
  text: string,
  replaced: { start: number; end: number },
  replacementLen: number,
): SyntaxNode {
  const result = tryReparse(text, replaced, replacementLen, null, root, 0);
  if (result) {
    return root;
  }

  const id = Span.id(root.span());
  let newRoot: SyntaxNode;
  if (root.kind() === SyntaxKind.Code) {
    newRoot = parseCode(text);
  } else if (root.kind() === SyntaxKind.Math) {
    newRoot = parseMath(text);
  } else {
    newRoot = parse(text);
  }

  if (id !== undefined) {
    try {
      newRoot.numberize(id, { start: 0n, end: 1n << 60n });
    } catch (e) {
      if (!(e instanceof NumberingError)) throw e;
    }
  }

  return newRoot;
}

function tryReparse(
  text: string,
  replaced: { start: number; end: number },
  replacementLen: number,
  parentKind: SyntaxKind | null,
  node: SyntaxNode,
  offset: number,
): { start: number; end: number } | null {
  let overlapStart = Number.MAX_SAFE_INTEGER;
  let overlapEnd = 0;
  let cursor = offset;
  const nodeKind = node.kind();

  const children = node.childrenMut();
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const prevLen = child.len();
    const prevRange = { start: cursor, end: cursor + prevLen };
    const prevDesc = child.descendants();

    if (!child.isLeaf() && includes(prevRange, replaced)) {
      const newLen = prevLen + replacementLen - (replaced.end - replaced.start);
      const newRange = { start: cursor, end: cursor + newLen };

      const range = tryReparse(text, { ...replaced }, replacementLen, nodeKind, child, cursor);
      if (range) {
        const newDesc = child.descendants();
        node.updateParent(prevLen, newLen, prevDesc, newDesc);
        return range;
      }

      if (SyntaxKind.isBlock(child.kind())) {
        const newborn = reparseBlock(text, newRange.start, newRange.end);
        if (newborn) {
          try {
            node.replaceChildren({ start: i, end: i + 1 }, [newborn]);
            return newRange;
          } catch (e) {
            if (!(e instanceof NumberingError)) throw e;
          }
        }
      }
    }

    if (overlaps(prevRange, replaced)) {
      overlapStart = Math.min(overlapStart, i);
      overlapEnd = i + 1;
    }

    if (replaced.end < cursor) {
      break;
    }

    cursor += prevLen;
  }

  if (
    overlapStart >= overlapEnd ||
    node.kind() !== SyntaxKind.Markup ||
    !(parentKind === null || parentKind === SyntaxKind.ContentBlock)
  ) {
    return null;
  }

  let expansion = 1;
  while (true) {
    let start = Math.max(0, overlapStart - Math.max(expansion, 2));
    let end = Math.min(overlapEnd + expansion, children.length);

    while (start > 0 && expand(children[start]!)) {
      start--;
    }

    while (end < children.length && expand(children[end]!)) {
      end++;
    }

    if (start > 0 && children[start - 1]!.kind() === SyntaxKind.Hash) {
      start--;
    }

    let prefixLen = 0;
    let nesting = 0;
    let atStart = true;
    for (let i = 0; i < start; i++) {
      prefixLen += children[i]!.len();
      atStart = nextAtStart(children[i]!, atStart);
      nesting = nextNesting(children[i]!, nesting);
    }

    let prevLen = 0;
    let prevAtStartAfter = atStart;
    let prevNestingAfter = nesting;
    for (let i = start; i < end; i++) {
      prevLen += children[i]!.len();
      prevAtStartAfter = nextAtStart(children[i]!, prevAtStartAfter);
      prevNestingAfter = nextNesting(children[i]!, prevNestingAfter);
    }

    const shifted = offset + prefixLen;
    const newLen = prevLen + replacementLen - (replaced.end - replaced.start);
    const newRange = { start: shifted, end: shifted + newLen };
    const atEnd = end === children.length;

    const atStartObj = { val: atStart };
    const nestingObj = { val: nesting };
    const reparsed = reparseMarkup(text, newRange.start, newRange.end, atStartObj, nestingObj, parentKind === null);

    if (reparsed) {
      if (
        (atEnd || atStartObj.val === prevAtStartAfter) &&
        ((atEnd && parentKind === null) || nestingObj.val === prevNestingAfter)
      ) {
        try {
          node.replaceChildren({ start, end }, reparsed);
          return newRange;
        } catch (e) {
          if (!(e instanceof NumberingError)) throw e;
        }
      }
    }

    if (start === 0 && atEnd) break;
    expansion *= 2;
  }

  return null;
}

function includes(outer: { start: number; end: number }, inner: { start: number; end: number }) {
  return outer.start < inner.start && outer.end > inner.end;
}

function overlaps(first: { start: number; end: number }, second: { start: number; end: number }) {
  return (
    (first.start <= second.start && second.start <= first.end) ||
    (second.start <= first.start && first.start <= second.end)
  );
}

function checkCharIsNewline(str: string): boolean {
  return Array.from(str).some(
    (c) =>
      c === '\n' ||
      c === '\r' ||
      c === '\u000B' ||
      c === '\u000C' ||
      c === '\u0085' ||
      c === '\u2028' ||
      c === '\u2029',
  );
}

function expand(node: SyntaxNode): boolean {
  if (!node) return false;
  const kind = node.kind();
  return (
    SyntaxKind.isTrivia(kind) ||
    kind === SyntaxKind.Error ||
    kind === SyntaxKind.Semicolon ||
    node.text() === '/' ||
    node.text() === ':'
  );
}

function nextAtStart(node: SyntaxNode, atStart: boolean): boolean {
  const kind = node.kind();
  if (SyntaxKind.isTrivia(kind)) {
    return atStart || kind === SyntaxKind.Parbreak || (kind === SyntaxKind.Space && checkCharIsNewline(node.text()));
  } else {
    return false;
  }
}

function nextNesting(node: SyntaxNode, nesting: number): number {
  if (node.kind() === SyntaxKind.Text) {
    if (node.text() === '[') return nesting + 1;
    if (node.text() === ']' && nesting > 0) return nesting - 1;
  }
  return nesting;
}
