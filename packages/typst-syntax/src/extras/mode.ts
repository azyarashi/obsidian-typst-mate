import { LinkedNode, Side, SyntaxKind, SyntaxMode, type SyntaxNode } from '@/typst-syntax';

export interface SyntaxContext {
  mode: SyntaxMode | null;
  /**
   * Whether the position is currently within a node that is treated as a block-level element.
   *
   * Note:
   * - This property reflects the underlying syntax, **so it remains consistent regardless of how *set* and *show* rules customize the element**.
   * - If `undefined`, the state is inferred from the parent node.
   *
   * Logic details per mode:
   * - **{@link SyntaxMode.Markup}**: Inside a {@link SyntaxKind.ContentBlock}.
   * - **{@link SyntaxMode.Math}**: Inside a {@link SyntaxKind.Equation} whose leading and trailing children are {@link SyntaxKind.Space}.
   * - **{@link SyntaxMode.Code}**: Inside a {@link SyntaxKind.CodeBlock}.
   * - **{@link SyntaxMode.Plain}**: Inside a {@link SyntaxKind.BlockComment} or a multi-line {@link SyntaxKind.Raw}.
   */
  isBlock?: boolean;

  kindLeft: SyntaxKind | null;
  kindRight: SyntaxKind | null;
}

export function getSyntaxContextAt(node: SyntaxNode, pos: number, topMode: SyntaxMode = SyntaxMode.Markup): SyntaxContext {
  const linkedNode = LinkedNode.new(node);
  const mode = topMode;

  const nodeLeft = linkedNode.leafAt(pos, Side.Before);
  const nodeRight = linkedNode.leafAt(pos, Side.After);
  const kindLeft = nodeLeft?.kind() ?? mapModeToKind(topMode);
  const kindRight = nodeRight?.kind() ?? SyntaxKind.End;
  if (nodeLeft === undefined) return { mode, kindLeft, kindRight };

  if (isNonRawPlain(pos, kindLeft, kindRight, nodeLeft.offset))
    return { mode: SyntaxMode.Plain, isBlock: kindLeft === SyntaxKind.BlockComment, kindLeft, kindRight };

  return { mode, ...getSyntaxContextAtInternal(nodeLeft, pos), kindLeft, kindRight };
}

function getSyntaxContextAtInternal(leftNode: LinkedNode, pos: number): Partial<SyntaxContext> {
  let k: SyntaxKind;
  let node: LinkedNode | undefined = leftNode;
  const isDelim = leftNode?.kind() === SyntaxKind.RawDelim;

  while (node) {
    k = node.kind();

    // * Math
    if (k === SyntaxKind.Math) {
      node = node.parent;
      if (!node) return {};
      // SyntaxKind.Equation
      k = node.kind();
    }
    if (k === SyntaxKind.Equation) {
      const { start, end } = node.range();
      if (pos < end) {
        const kindLeft = node.leafAt(start + 1, Side.After)?.kind();
        const kindRight = node.leafAt(end - 1, Side.Before)?.kind();
        const isBlock = kindLeft === SyntaxKind.Space && kindRight === SyntaxKind.Space;

        return { mode: SyntaxMode.Math, isBlock };
      }

      node = node.parent;
      continue;
    }

    // * Markup
    if (k === SyntaxKind.Markup) {
      node = node.parent; // 存在するなら ContentBlock もしくは Emph など
      if (!node) return {}; // トップレベルに合わせる
      return {
        mode: SyntaxMode.Markup,
        isBlock: node.kind() === SyntaxKind.ContentBlock || node.parent?.kind() === SyntaxKind.ContentBlock,
      };
    }
    if (k === SyntaxKind.ContentBlock) {
      const end = node.offset + node.len();
      if (pos < end) return { mode: SyntaxMode.Markup, isBlock: true };

      node = node.parent;
      continue;
    }

    // * Plain
    if (k === SyntaxKind.Raw && !isDelim) {
      const { start, end } = node.range();
      const delimLength = leftNode.text().length - 1;
      if (start + delimLength <= pos && pos <= end - delimLength) {
        return { mode: SyntaxMode.Plain, isBlock: node.text().includes('\n') };
      }
    }

    // * Code
    if (k === SyntaxKind.Code) {
      node = node.parent; // 存在するなら CodeBlock
      if (!node) return {}; // トップレベルに合わせる
      return { mode: SyntaxMode.Code, isBlock: node.kind() === SyntaxKind.CodeBlock };
    }
    if (k === SyntaxKind.CodeBlock) {
      const end = node.offset + node.len();
      if (pos < end) return { mode: SyntaxMode.Code, isBlock: true };

      node = node.parent;
      continue;
    }
    if (k === SyntaxKind.Hash) return { mode: SyntaxMode.Code, isBlock: false };
    if (k === SyntaxKind.Space || k === SyntaxKind.Parbreak) {
      if (node.parentKind() === SyntaxKind.Markup) {
        const textBefore = node.text().slice(0, pos - node.offset);
        // ? Markup 中の区切り (改行及びセミコロン)
        if (textBefore.includes('\n')) {
          node = node.parent;
          continue;
        }

        const prevNode = node.prevSibling();
        if (!prevNode) {
          node = node.parent;
          continue;
        }
        const prevKind = prevNode.kind();
        if (
          prevKind === SyntaxKind.Semicolon ||
          // * ATOMIC_CODE_PRIMARY
          prevKind === SyntaxKind.Ident ||
          // ブロックと数式
          prevKind === SyntaxKind.CodeBlock ||
          prevKind === SyntaxKind.ContentBlock ||
          prevKind === SyntaxKind.Equation ||
          // 式の囲い・複合リテラル
          prevKind === SyntaxKind.Parenthesized ||
          prevKind === SyntaxKind.Array ||
          prevKind === SyntaxKind.Dict ||
          // リテラル
          prevKind === SyntaxKind.None ||
          prevKind === SyntaxKind.Auto ||
          (SyntaxKind.Bool <= prevKind && prevKind <= SyntaxKind.Str) ||
          prevKind === SyntaxKind.Label ||
          prevKind === SyntaxKind.Raw ||
          // ? LoopBreak, LoopContinue は必要なし
          // ? FuncReturn はスペースを含む
          // ? STMT は必要なし

          // * 演算・呼び出し・アクセス (codeExprPrec)
          prevKind === SyntaxKind.FuncCall ||
          prevKind === SyntaxKind.FieldAccess
          // ? Closure, DestructAssignment, Unary, Binary はスペースを含む
        ) {
          node = node.parent;
          continue;
        }

        // ? CODE_PRIMARY
        if (
          prevKind === SyntaxKind.Conditional ||
          prevKind === SyntaxKind.ForLoop ||
          prevKind === SyntaxKind.WhileLoop
        ) {
          const textPrev = prevNode.text();
          if (textPrev.endsWith('}') || textPrev.endsWith(']')) {
            node = node.parent;
            continue;
          }
        }

        const prevPrevNode = prevNode.prevSibling();
        if (!prevPrevNode) {
          node = node.parent;
          continue;
        }
        const prevPrevKind = prevPrevNode.kind();

        if (prevPrevKind === SyntaxKind.Hash) return { mode: SyntaxMode.Code, isBlock: false };
      }
    } else if ((SyntaxKind.isStmt(k) || isAtomicCodePrimary(k)) && node.prevSiblingKind() === SyntaxKind.Hash) {
      return { mode: SyntaxMode.Code, isBlock: false };
    }

    node = node.parent;
  }

  return {};
}

export function isNonRawPlain(
  pos: number,
  leftKind: SyntaxKind | null,
  rightKind: SyntaxKind | null,
  offset: number,
): boolean {
  // ! 仮に新しく入力を行ったとき, どう変化するかが基準

  // ? `"` の内側のみ
  if (leftKind === SyntaxKind.Str && rightKind === SyntaxKind.Str) return true;

  // ? `//` の間で入力するとそのカーソル位置はコメントではなくなるので `//` 以降のみ
  if (leftKind === SyntaxKind.LineComment) {
    if (offset + 1 < pos) return true;
    return false;
  }
  // ? 上記と同様
  if (leftKind === SyntaxKind.BlockComment && rightKind === SyntaxKind.BlockComment) {
    // ? `pos < rangeRightEnd - 1` は, 入力後に閉じられていた `*/`がなくなり, 次の `*/` または最後まで BlockComment になるため不要
    if (offset + 1 < pos) return true;
    return false;
  }

  // ? `#` 以降のみ
  if (leftKind === SyntaxKind.Shebang) return true;

  return false;
}

export function mapModeToKind(mode: SyntaxMode): SyntaxKind {
  switch (mode) {
    case SyntaxMode.Markup:
      return SyntaxKind.Markup;
    case SyntaxMode.Code:
      return SyntaxKind.Code;
    case SyntaxMode.Math:
      return SyntaxKind.Math;
    case SyntaxMode.Plain:
      return SyntaxKind.End;
  }
}

function isAtomicCodePrimary(k: SyntaxKind): boolean {
  return (
    k === SyntaxKind.Ident ||
    // 式の囲い・複合リテラル
    k === SyntaxKind.Parenthesized ||
    k === SyntaxKind.Array ||
    k === SyntaxKind.Dict ||
    // リテラル
    k === SyntaxKind.None ||
    k === SyntaxKind.Auto ||
    (SyntaxKind.Bool <= k && k <= SyntaxKind.Str) ||
    k === SyntaxKind.Label ||
    k === SyntaxKind.Raw ||
    // 制御
    k === SyntaxKind.Contextual ||
    k === SyntaxKind.Conditional ||
    k === SyntaxKind.ForLoop ||
    k === SyntaxKind.WhileLoop ||
    k === SyntaxKind.LoopBreak ||
    k === SyntaxKind.LoopContinue ||
    k === SyntaxKind.FuncReturn ||
    // 演算・呼び出し・アクセス (codeExprPrec)
    k === SyntaxKind.FuncCall ||
    k === SyntaxKind.FieldAccess
  );
}
