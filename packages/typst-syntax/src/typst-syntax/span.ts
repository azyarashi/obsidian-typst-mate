import { FileId } from './file';
export type { FileId };

export type Span = bigint;

export namespace Span {
  export const FULL_START = 2n;
  export const FULL_END = 1n << 47n;
  export const DETACHED = 1n;

  export const NUMBER_BITS = 48n;
  export const FILE_ID_SHIFT = 48n;
  export const NUMBER_MASK = (1n << 48n) - 1n;
  export const RANGE_BASE = 1n << 47n;
  export const RANGE_PART_BITS = 23n;
  export const RANGE_PART_SHIFT = 23n;
  export const RANGE_PART_MASK = (1n << 23n) - 1n;

  export function detached(): Span {
    return DETACHED;
  }

  export function fromNumber(id: FileId, number: bigint): Span | undefined {
    if (number < FULL_START || number >= FULL_END) {
      return undefined;
    }
    return pack(id, number);
  }

  export function fromRange(id: FileId, start: number, end: number): Span {
    const max = 1 << 23;
    const startNum = BigInt(start > max ? max : start);
    const endNum = BigInt(end > max ? max : end);
    const number = (startNum << RANGE_PART_SHIFT) | endNum;
    return pack(id, RANGE_BASE + number);
  }

  export function fromRaw(v: bigint): Span {
    return v;
  }

  export function pack(id: FileId, low: bigint): Span {
    const bits = (BigInt(id.intoRaw()) << FILE_ID_SHIFT) | low;
    return bits;
  }

  export function isDetached(span: Span): boolean {
    return span === DETACHED;
  }

  export function id(span: Span): FileId | undefined {
    const fileIdNum = Number(span >> FILE_ID_SHIFT) & 0xffff;
    if (fileIdNum === 0) {
      return undefined;
    }
    return FileId.fromRaw(fileIdNum);
  }

  export function number(span: Span): bigint {
    return span & NUMBER_MASK;
  }

  export function range(span: Span): { start: number; end: number } | undefined {
    const num = number(span);
    const sub = num - RANGE_BASE;
    if (sub < 0n) {
      return undefined;
    }

    const start = Number(sub >> RANGE_PART_SHIFT);
    const end = Number(sub & RANGE_PART_MASK);
    return { start, end };
  }

  export function intoRaw(span: Span): bigint {
    return span;
  }

  export function or(span: Span, other: Span): Span {
    if (isDetached(span)) {
      return other;
    } else {
      return span;
    }
  }

  export function find(iter: Iterable<Span>): Span {
    for (const span of iter) {
      if (!isDetached(span)) {
        return span;
      }
    }
    return detached();
  }

  export function resolvePath(span: Span, path: string): FileId | undefined {
    const file = id(span);
    if (!file) return undefined;
    return file.join(path);
  }
}

export class Spanned<T> {
  constructor(
    public readonly v: T,
    public readonly span: Span,
  ) {}

  public static new<T>(v: T, span: Span): Spanned<T> {
    return new Spanned(v, span);
  }

  public map<U>(f: (v: T) => U): Spanned<U> {
    return new Spanned(f(this.v), this.span);
  }
}
