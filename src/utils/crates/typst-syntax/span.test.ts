// https://github.com/typst/typst/blob/main/crates/typst-syntax/src/span.rs
import { describe, expect, it } from 'bun:test';
import { FileId } from './file';
import { Span, Spanned } from './span';

describe('Span', () => {
  it('detached', () => {
    const span = Span.detached();
    expect(Span.isDetached(span)).toBe(true);
    expect(Span.id(span)).toBe(undefined);
    expect(Span.range(span)).toBe(undefined);
  });

  it('number encoding', () => {
    const id = FileId.fromRaw(5);
    const span = Span.fromNumber(id, 10n);
    expect(span).not.toBe(undefined);
    expect(Span.id(span!)!.intoRaw()).toBe(5);
    expect(Span.number(span!)).toBe(10n);
    expect(Span.range(span!)).toBe(undefined);
  });

  it('range encoding', () => {
    const id = FileId.fromRaw(0xffff);

    const span1 = Span.fromRange(id, 0, 0);
    expect(Span.id(span1)!.intoRaw()).toBe(0xffff);
    expect(Span.range(span1)).toEqual({ start: 0, end: 0 });

    const span2 = Span.fromRange(id, 177, 233);
    expect(Span.id(span2)!.intoRaw()).toBe(0xffff);
    expect(Span.range(span2)).toEqual({ start: 177, end: 233 });

    const span3 = Span.fromRange(id, 0, 8388607);
    expect(Span.id(span3)!.intoRaw()).toBe(0xffff);
    expect(Span.range(span3)).toEqual({ start: 0, end: 8388607 });

    const span4 = Span.fromRange(id, 8388606, 8388607);
    expect(Span.id(span4)!.intoRaw()).toBe(0xffff);
    expect(Span.range(span4)).toEqual({ start: 8388606, end: 8388607 });
  });

  it('or', () => {
    const detached = Span.detached();
    const id = FileId.fromRaw(1);
    const real = Span.fromNumber(id, 10n)!;
    expect(Span.or(detached, real)).toBe(real);
    expect(Span.or(real, detached)).toBe(real);
  });

  it('find', () => {
    const detached = Span.detached();
    const id = FileId.fromRaw(1);
    const real = Span.fromNumber(id, 10n)!;
    expect(Span.find([detached, detached, real])).toBe(real);
    expect(Span.find([detached, detached])).toBe(detached);
  });
});

describe('Spanned', () => {
  it('map', () => {
    const id = FileId.fromRaw(1);
    const span = Span.fromNumber(id, 10n)!;
    const s = Spanned.new(42, span);
    const mapped = s.map((v) => v.toString());
    expect(mapped.v).toBe('42');
    expect(mapped.span).toBe(span);
  });
});
