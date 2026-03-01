import { SyntaxKind } from './kind';
import type { FileId } from './span';
import { Span } from './span';

export abstract class SyntaxNode {
  public abstract kind(): SyntaxKind;
  public abstract len(): number;
  public abstract span(): Span;
  public abstract text(): string;
  public abstract intoText(): string;
  public abstract children(): readonly SyntaxNode[];
  public abstract erroneous(): boolean;
  public abstract errors(): SyntaxErrorNode[];
  public abstract hint(hintMsg: string): void;
  public abstract synthesize(span: Span): void;
  public abstract spanlessEq(other: SyntaxNode): boolean;

  public abstract numberize(id: FileId, within: { start: bigint; end: bigint }): void;

  public abstract isLeaf(): boolean;
  public abstract descendants(): number;
  public abstract childrenMut(): SyntaxNode[];
  public abstract replaceChildren(range: { start: number; end: number }, replacement: SyntaxNode[]): void;
  public abstract updateParent(prevLen: number, newLen: number, prevDescendants: number, newDescendants: number): void;
  public abstract upper(): bigint;

  public abstract clone(): SyntaxNode;

  public static leaf(kind: SyntaxKind, text: string): SyntaxNode {
    return new LeafNode(kind, text, Span.detached());
  }

  public static inner(kind: SyntaxKind, children: SyntaxNode[]): SyntaxNode {
    return new InnerNode(kind, children);
  }

  public static error(error: SyntaxErrorNode, text: string): SyntaxNode {
    return new ErrorNode(text, error);
  }

  public static placeholder(kind: SyntaxKind): SyntaxNode {
    if (kind === SyntaxKind.Error) {
      throw new Error('cannot create error placeholder');
    }
    return new LeafNode(kind, '', Span.detached());
  }

  public isEmpty(): boolean {
    return this.len() === 0;
  }

  public convertToKind(kind: SyntaxKind): void {
    if (this instanceof ErrorNode) {
      throw new Error('cannot convert error');
    }
    if (this instanceof LeafNode || this instanceof InnerNode) {
      (this as any)._kind = kind;
    }
  }

  public convertToError(message: string): void {
    if (this.kind() !== SyntaxKind.Error) {
      const err = SyntaxErrorNode.new(message);
      const text = this.intoText();

      for (const key of Object.keys(this)) {
        delete (this as any)[key];
      }

      Object.setPrototypeOf(this, ErrorNode.prototype);
      (this as any)._text = text;
      (this as any)._error = err;
    }
  }

  public expected(expectedMsg: string): void {
    const kind = this.kind();
    const name = SyntaxKind[kind];
    const msg = `expected ${expectedMsg}, found ${name}`;
    this.convertToError(msg);

    if (SyntaxKind.isKeyword(kind) && (expectedMsg === 'identifier' || expectedMsg === 'pattern')) {
      this.hint(`keyword \`${this.text()}\` is not allowed as an identifier; try \`${this.text()}_\` instead`);
    }
  }

  public unexpected(): void {
    const kind = this.kind();
    const name = SyntaxKind[kind];
    this.convertToError(`unexpected ${name}`);
  }
}

export class LeafNode extends SyntaxNode {
  constructor(
    public _kind: SyntaxKind,
    public _text: string,
    public _span: Span,
  ) {
    super();
  }

  public kind(): SyntaxKind {
    return this._kind;
  }
  public len(): number {
    return this._text.length;
  } // JS なので UTF-16
  public span(): Span {
    return this._span;
  }
  public text(): string {
    return this._text;
  }
  public intoText(): string {
    return this._text;
  }
  public children(): readonly SyntaxNode[] {
    return [];
  }
  public erroneous(): boolean {
    return false;
  }
  public errors(): SyntaxErrorNode[] {
    return [];
  }
  public hint(_hintMsg: string): void {}
  public synthesize(span: Span): void {
    this._span = span;
  }
  public spanlessEq(other: SyntaxNode): boolean {
    if (!(other instanceof LeafNode)) return false;
    return this._kind === other._kind && this._text === other._text;
  }

  public numberize(id: FileId, within: { start: bigint; end: bigint }): void {
    if (within.start >= within.end) throw new NumberingError();
    const mid = (within.start + within.end) / 2n;
    this._span = Span.fromNumber(id, mid) !== undefined ? Span.fromNumber(id, mid)! : Span.detached();
  }
  public isLeaf(): boolean {
    return true;
  }
  public descendants(): number {
    return 1;
  }
  public childrenMut(): SyntaxNode[] {
    return [];
  }
  public replaceChildren(_range: { start: number; end: number }, _replacement: SyntaxNode[]): void {}
  public updateParent(_prevLen: number, _newLen: number, _prevDescendants: number, _newDescendants: number): void {}
  public upper(): bigint {
    return Span.number(this._span) + 1n;
  }
  public clone(): SyntaxNode {
    return new LeafNode(this._kind, this._text, this._span);
  }
}

export class InnerNode extends SyntaxNode {
  public _kind: SyntaxKind;
  public _len: number;
  public _span: Span;
  public _descendants: number;
  public _erroneous: boolean;
  public _upper: bigint;
  public _children: SyntaxNode[];

  constructor(kind: SyntaxKind, children: SyntaxNode[]) {
    super();
    this._kind = kind;
    let len = 0;
    let descendants = 1;
    let erroneous = false;

    for (const child of children) {
      len += child.len();
      descendants += child.descendants();
      erroneous = erroneous || child.erroneous();
    }

    this._len = len;
    this._descendants = descendants;
    this._erroneous = erroneous;
    this._upper = 0n;
    this._span = Span.detached();
    this._children = children;
  }

  public kind(): SyntaxKind {
    return this._kind;
  }
  public len(): number {
    return this._len;
  }
  public span(): Span {
    return this._span;
  }
  public text(): string {
    return '';
  }
  public intoText(): string {
    return this._children.map((c) => c.intoText()).join('');
  }
  public children(): readonly SyntaxNode[] {
    return this._children;
  }
  public erroneous(): boolean {
    return this._erroneous;
  }
  public errors(): SyntaxErrorNode[] {
    if (!this._erroneous) return [];
    return this._children.filter((c) => c.erroneous()).flatMap((c) => c.errors());
  }
  public hint(_hintMsg: string): void {}
  public synthesize(span: Span): void {
    this._span = span;
    this._upper = Span.number(span);
    for (const child of this._children) child.synthesize(span);
  }

  public spanlessEq(other: SyntaxNode): boolean {
    if (!(other instanceof InnerNode)) return false;
    if (
      this._kind !== other._kind ||
      this._len !== other._len ||
      this._descendants !== other._descendants ||
      this._erroneous !== other._erroneous
    )
      return false;
    if (this._children.length !== other._children.length) return false;
    for (let i = 0; i < this._children.length; i++) {
      const a = this._children[i];
      const b = other._children[i];
      if (a && b && !a.spanlessEq(b)) return false;
    }
    return true;
  }

  public numberize(id: FileId, within: { start: bigint; end: bigint }, range?: { start: number; end: number }): void {
    let descendants = 0;
    if (range) {
      if (range.start >= range.end) return;
      for (let i = range.start; i < range.end; i++) {
        const child = this._children[i];
        if (child) descendants += child.descendants();
      }
    } else {
      descendants = this._descendants;
    }

    const space = within.end - within.start;
    let stride = space / (2n * BigInt(descendants));
    if (stride === 0n) {
      stride = space / BigInt(this._descendants);
      if (stride === 0n) throw new NumberingError();
    }

    let start = within.start;
    if (!range) {
      const end = start + stride;
      const spanObj = Span.fromNumber(id, (start + end) / 2n);
      this._span = spanObj !== undefined ? spanObj : Span.detached();
      this._upper = within.end;
      start = end;
    }

    const rStart = range ? range.start : 0;
    const rEnd = range ? range.end : this._children.length;

    for (let i = rStart; i < rEnd; i++) {
      const child = this._children[i];
      if (!child) continue;
      const end = start + BigInt(child.descendants()) * stride;
      child.numberize(id, { start, end });
      start = end;
    }
  }

  public isLeaf(): boolean {
    return false;
  }
  public descendants(): number {
    return this._descendants;
  }
  public childrenMut(): SyntaxNode[] {
    return this._children;
  }

  public replaceChildren(rangeObj: { start: number; end: number }, replacement: SyntaxNode[]): void {
    let rangeStart = rangeObj.start;
    let rangeEnd = rangeObj.end;
    const id = Span.id(this._span);
    let replacementStart = 0;
    let replacementEnd = replacement.length;

    while (rangeStart < rangeEnd && replacementStart < replacementEnd) {
      const child = this._children[rangeStart];
      const repl = replacement[replacementStart];
      if (child && repl && child.spanlessEq(repl as SyntaxNode)) {
        rangeStart++;
        replacementStart++;
      } else break;
    }

    while (rangeStart < rangeEnd && replacementStart < replacementEnd) {
      const child = this._children[rangeEnd - 1];
      const repl = replacement[replacementEnd - 1];
      if (child && repl && child.spanlessEq(repl as SyntaxNode)) {
        rangeEnd--;
        replacementEnd--;
      } else break;
    }

    const actualReplacement = replacement.slice(replacementStart, replacementEnd);
    const superseded = this._children.slice(rangeStart, rangeEnd);

    this._len =
      this._len +
      actualReplacement.map((x) => x.len()).reduce((a, b) => a + b, 0) -
      superseded.map((x) => x.len()).reduce((a, b) => a + b, 0);
    this._descendants =
      this._descendants +
      actualReplacement.map((x) => x.descendants()).reduce((a, b) => a + b, 0) -
      superseded.map((x) => x.descendants()).reduce((a, b) => a + b, 0);

    this._erroneous =
      actualReplacement.some((x) => x.erroneous()) ||
      (this._erroneous &&
        (this._children.slice(0, rangeStart).some((x) => x.erroneous()) ||
          this._children.slice(rangeEnd).some((x) => x.erroneous())));

    this._children.splice(rangeStart, rangeEnd - rangeStart, ...actualReplacement);
    rangeEnd = rangeStart + actualReplacement.length;

    if (!id) return;

    let left = 0;
    let right = 0;
    const maxLeft = rangeStart;
    const maxRight = this._children.length - rangeEnd;

    while (true) {
      const renumberStart = rangeStart - left;
      const renumberEnd = rangeEnd + right;

      let startNumber = Span.number(this.span()) + 1n; // fallback
      const prevChild = renumberStart > 0 ? this._children[renumberStart - 1] : undefined;
      if (prevChild) startNumber = prevChild.upper();
      else startNumber = Span.number(this._span) + 1n;

      let endNumber = this._upper;
      const nextChild = renumberEnd < this._children.length ? this._children[renumberEnd] : undefined;
      if (nextChild) endNumber = Span.number(nextChild.span());
      else endNumber = this._upper;

      try {
        this.numberize(id, { start: startNumber, end: endNumber }, { start: renumberStart, end: renumberEnd });
        return;
      } catch (e) {
        if (e instanceof NumberingError) {
          if (left === maxLeft && right === maxRight) throw e;
          const nextPowerOfTwo = (n: number) => {
            let p = 1;
            while (p <= n) p *= 2;
            return p;
          };
          left = Math.min(nextPowerOfTwo(left + 1), maxLeft);
          right = Math.min(nextPowerOfTwo(right + 1), maxRight);
        } else {
          throw e;
        }
      }
    }
  }

  public updateParent(prevLen: number, newLen: number, prevDescendants: number, newDescendants: number): void {
    this._len = this._len + newLen - prevLen;
    this._descendants = this._descendants + newDescendants - prevDescendants;
    this._erroneous = this._children.some((c) => c.erroneous());
  }

  public upper(): bigint {
    return this._upper;
  }

  public clone(): SyntaxNode {
    const cloned = new InnerNode(this._kind, [...this._children]);
    cloned._len = this._len;
    cloned._span = this._span;
    cloned._descendants = this._descendants;
    cloned._erroneous = this._erroneous;
    cloned._upper = this._upper;
    return cloned;
  }
}

export class ErrorNode extends SyntaxNode {
  constructor(
    public _text: string,
    public _error: SyntaxErrorNode,
  ) {
    super();
  }

  public kind(): SyntaxKind {
    return SyntaxKind.Error;
  }
  public len(): number {
    return this._text.length;
  }
  public span(): Span {
    return this._error.span;
  }
  public text(): string {
    return this._text;
  }
  public intoText(): string {
    return this._text;
  }
  public children(): readonly SyntaxNode[] {
    return [];
  }
  public erroneous(): boolean {
    return true;
  }
  public errors(): SyntaxErrorNode[] {
    return [this._error];
  }
  public hint(hintMsg: string): void {
    this._error.hints.push(hintMsg);
  }
  public synthesize(span: Span): void {
    this._error.span = span;
  }
  public spanlessEq(other: SyntaxNode): boolean {
    if (!(other instanceof ErrorNode)) return false;
    return this._text === other._text && this._error.spanlessEq(other._error);
  }

  public numberize(id: FileId, within: { start: bigint; end: bigint }): void {
    if (within.start >= within.end) throw new NumberingError();
    const mid = (within.start + within.end) / 2n;
    this._error.span = Span.fromNumber(id, mid) !== undefined ? Span.fromNumber(id, mid)! : Span.detached();
  }
  public isLeaf(): boolean {
    return false;
  }
  public descendants(): number {
    return 1;
  }
  public childrenMut(): SyntaxNode[] {
    return [];
  }
  public replaceChildren(_range: { start: number; end: number }, _replacement: SyntaxNode[]): void {}
  public updateParent(_prevLen: number, _newLen: number, _prevDescendants: number, _newDescendants: number): void {}
  public upper(): bigint {
    return Span.number(this._error.span) + 1n;
  }
  public clone(): SyntaxNode {
    return new ErrorNode(this._text, this._error.clone());
  }
}

export class SyntaxErrorNode {
  constructor(
    public span: Span,
    public message: string,
    public hints: string[] = [],
  ) {}

  public static new(message: string): SyntaxErrorNode {
    return new SyntaxErrorNode(Span.detached(), message, []);
  }

  public spanlessEq(other: SyntaxErrorNode): boolean {
    if (this.message !== other.message) return false;
    if (this.hints.length !== other.hints.length) return false;
    for (let i = 0; i < this.hints.length; i++) if (this.hints[i] !== other.hints[i]) return false;
    return true;
  }

  public clone(): SyntaxErrorNode {
    return new SyntaxErrorNode(this.span, this.message, [...this.hints]);
  }
}

export class LinkedNode {
  constructor(
    public readonly node: SyntaxNode,
    public readonly parent: LinkedNode | undefined,
    public readonly index: number,
    public readonly offset: number,
  ) {}

  public static new(root: SyntaxNode): LinkedNode {
    return new LinkedNode(root, undefined, 0, 0);
  }

  public get(): SyntaxNode {
    return this.node;
  }
  public getIndex(): number {
    return this.index;
  }
  public getOffset(): number {
    return this.offset;
  }
  public range(): { start: number; end: number } {
    return { start: this.offset, end: this.offset + this.node.len() };
  }

  public kind(): SyntaxKind {
    return this.node.kind();
  }
  public text(): string {
    return this.node.text();
  }
  public len(): number {
    return this.node.len();
  }
  public span(): Span {
    return this.node.span();
  }
  public isLeaf(): boolean {
    return this.node.isLeaf();
  }

  public isEmpty(): boolean {
    return this.node.isEmpty();
  }
  public erroneous(): boolean {
    return this.node.erroneous();
  }
  public errors(): SyntaxErrorNode[] {
    return this.node.errors();
  }
  public spanlessEq(other: SyntaxNode): boolean {
    return this.node.spanlessEq(other);
  }
  public descendants(): number {
    return this.node.descendants();
  }
  public upper(): bigint {
    return this.node.upper();
  }

  public children(): LinkedNode[] {
    const childrenNodes = this.node.children();
    const result: LinkedNode[] = [];
    let currentOffset = this.offset;
    for (let i = 0; i < childrenNodes.length; i++) {
      const child = childrenNodes[i];
      if (!child) continue;
      result.push(new LinkedNode(child, this, i, currentOffset));
      currentOffset += child.len();
    }
    return result;
  }

  public find(span: Span): LinkedNode | undefined {
    if (this.node.span() === span) return this;

    if (this.node instanceof InnerNode) {
      if (Span.number(span) < Span.number(this.node.span())) return undefined;

      const children = this.children();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child) continue;
        const nextContent = children[i + 1] ? Span.number(children[i + 1]!.node.span()) : undefined;
        if (nextContent === undefined || nextContent > Span.number(span)) {
          const found = child.find(span);
          if (found) return found;
        }
      }
    }
    return undefined;
  }

  public prevSibling(): LinkedNode | undefined {
    if (!this.parent) return undefined;
    const index = this.index - 1;
    if (index < 0) return undefined;
    if (!this.parent.node.childrenMut) return undefined;
    const prevChild = index >= 0 ? this.parent.node.children()[index] : undefined;
    if (!prevChild) return undefined;
    const offset = this.offset - prevChild.len();
    const prev = new LinkedNode(prevChild, this.parent, index, offset);
    if (SyntaxKind.isTrivia(prev.kind())) return prev.prevSibling();
    return prev;
  }

  public nextSibling(): LinkedNode | undefined {
    if (!this.parent) return undefined;
    const index = this.index + 1;
    if (index >= this.parent.node.children().length) return undefined;
    const nextChild = index < this.parent.node.children().length ? this.parent.node.children()[index] : undefined;
    if (!nextChild) return undefined;
    const offset = this.offset + this.node.len();
    const next = new LinkedNode(nextChild, this.parent, index, offset);
    if (SyntaxKind.isTrivia(next.kind())) return next.nextSibling();
    return next;
  }

  public parentKind(): SyntaxKind | undefined {
    return this.parent?.node.kind();
  }

  public prevSiblingKind(): SyntaxKind | undefined {
    return this.prevSibling()?.kind();
  }

  public nextSiblingKind(): SyntaxKind | undefined {
    return this.nextSibling()?.kind();
  }

  public prevLeaf(): LinkedNode | undefined {
    let curr: LinkedNode | undefined = this as LinkedNode | undefined;
    while (curr) {
      const prev = curr.prevSibling();
      if (!prev) break;
      const leaf = prev.rightmostLeaf();
      if (leaf) return leaf;
      curr = prev;
    }
    return this.parent?.prevLeaf();
  }

  public leftmostLeaf(): LinkedNode | undefined {
    if (this.isLeaf() && !SyntaxKind.isTrivia(this.kind()) && !SyntaxKind.isError(this.kind())) {
      return this;
    }
    for (const child of this.children()) {
      const leaf = child.leftmostLeaf();
      if (leaf) return leaf;
    }
    return undefined;
  }

  private leafBefore(cursor: number): LinkedNode | undefined {
    const children = this.children();
    if (children.length === 0 && cursor <= this.offset + this.len()) {
      return this;
    }

    let offset = this.offset;
    const count = children.length;
    for (let i = 0; i < count; i++) {
      const child = children[i];
      if (!child) continue;
      const len = child.len();
      if ((offset < cursor && cursor <= offset + len) || (offset === cursor && i + 1 === count)) {
        return child.leafBefore(cursor);
      }
      offset += len;
    }
    return undefined;
  }

  private leafAfter(cursor: number): LinkedNode | undefined {
    const children = this.children();
    if (children.length === 0 && cursor < this.offset + this.len()) {
      return this;
    }

    let offset = this.offset;
    for (const child of children) {
      if (!child) continue;
      const len = child.len();
      if (offset <= cursor && cursor < offset + len) {
        return child.leafAfter(cursor);
      }
      offset += len;
    }
    return undefined;
  }

  public leafAt(cursor: number, side: Side): LinkedNode | undefined {
    if (side === Side.Before) return this.leafBefore(cursor);
    return this.leafAfter(cursor);
  }

  public rightmostLeaf(): LinkedNode | undefined {
    if (this.isLeaf() && !SyntaxKind.isTrivia(this.kind())) return this;

    const children = this.children();
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (!child) continue;
      const leaf = child.rightmostLeaf();
      if (leaf) return leaf;
    }

    return undefined;
  }

  public nextLeaf(): LinkedNode | undefined {
    let curr: LinkedNode | undefined = this as LinkedNode | undefined;
    while (curr) {
      const next = curr.nextSibling();
      if (!next) break;
      const leaf = next.leftmostLeaf();
      if (leaf) return leaf;
      curr = next;
    }
    return this.parent?.nextLeaf();
  }
}

export class NumberingError extends Error {
  constructor() {
    super('cannot number within this interval');
  }
}

export enum Side {
  Before,
  After,
}
