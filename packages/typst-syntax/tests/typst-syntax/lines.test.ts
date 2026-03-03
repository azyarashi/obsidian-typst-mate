// https://github.com/typst/typst/blob/main/crates/typst-syntax/src/lines.rs
import { describe, expect, it } from 'bun:test';
import { Lines } from '@/typst-syntax/lines';

// "ä\tcde\nf💛g\r\nhi\rjkl"
const TEST = 'ä\tcde\nf💛g\r\nhi\rjkl';

describe('Lines', () => {
  it('new', () => {
    const lines = new Lines(TEST);
    expect(lines.lenLines()).toBe(4);
    expect(lines.lineToByte(0)).toBe(0);
    expect(lines.lineToByte(1)).toBe(7);
    expect(lines.lineToByte(2)).toBe(15);
    expect(lines.lineToByte(3)).toBe(18);
  });

  it('byte to line', () => {
    const lines = new Lines(TEST);
    expect(lines.byteToLine(0)).toBe(0);
    expect(lines.byteToLine(2)).toBe(0);
    expect(lines.byteToLine(6)).toBe(0);
    expect(lines.byteToLine(7)).toBe(1);
    expect(lines.byteToLine(8)).toBe(1);
    expect(lines.byteToLine(12)).toBe(1);
    expect(lines.byteToLine(21)).toBe(3);
    expect(lines.byteToLine(22)).toBe(undefined);
  });

  it('byte to column', () => {
    const lines = new Lines(TEST);
    expect(lines.byteToColumn(0)).toBe(0);
    expect(lines.byteToColumn(2)).toBe(1);
    expect(lines.byteToColumn(6)).toBe(5);
    expect(lines.byteToColumn(7)).toBe(0);
    expect(lines.byteToColumn(8)).toBe(1);
    expect(lines.byteToColumn(12)).toBe(2);
  });

  it('utf16 roundtrip', () => {
    const lines = new Lines(TEST);
    expect(lines.byteToUtf16(0)).toBe(0);
    expect(lines.utf16ToByte(0)).toBe(0);

    expect(lines.byteToUtf16(2)).toBe(1);
    expect(lines.utf16ToByte(1)).toBe(2);

    expect(lines.byteToUtf16(3)).toBe(2);
    expect(lines.utf16ToByte(2)).toBe(3);

    expect(lines.byteToUtf16(8)).toBe(7);
    expect(lines.utf16ToByte(7)).toBe(8);

    expect(lines.byteToUtf16(12)).toBe(9);
    expect(lines.utf16ToByte(9)).toBe(12);

    expect(lines.byteToUtf16(21)).toBe(18);
    expect(lines.utf16ToByte(18)).toBe(21);

    expect(lines.byteToUtf16(22)).toBe(undefined);
    expect(lines.utf16ToByte(19)).toBe(undefined);
  });

  it('line column roundtrip', () => {
    const lines = new Lines(TEST);
    // UTF-8 byte offsets at each line start
    for (const byteIdx of [0, 7, 12, 21]) {
      const line = lines.byteToLine(byteIdx);
      const column = lines.byteToColumn(byteIdx);
      expect(line).not.toBe(undefined);
      expect(column).not.toBe(undefined);
      expect(lines.lineColumnToByte(line!, column!)).toBe(byteIdx);
    }
  });

  it('edit', () => {
    // Test inserting at the beginning.
    {
      const l = new Lines('abc\n');
      l.edit({ start: 0, end: 0 }, 'hi\n');
      expect(l.text).toBe('hi\nabc\n');
    }
    {
      const l = new Lines('\nabc');
      l.edit({ start: 0, end: 0 }, 'hi\r');
      expect(l.text).toBe('hi\r\nabc');
    }
    // Test editing in the middle.
    {
      const l = new Lines(TEST);
      l.edit({ start: 4, end: 16 }, '❌');
      expect(l.text).toBe('ä\tc❌i\rjkl');
    }
    // Test appending.
    {
      const l = new Lines('abc\ndef');
      l.edit({ start: 7, end: 7 }, 'hi');
      expect(l.text).toBe('abc\ndefhi');
    }
    {
      const l = new Lines('abc\ndef\n');
      l.edit({ start: 8, end: 8 }, 'hi');
      expect(l.text).toBe('abc\ndef\nhi');
    }
    // Test appending with adjoining \r and \n.
    {
      const l = new Lines('abc\ndef\r');
      l.edit({ start: 8, end: 8 }, '\nghi');
      expect(l.text).toBe('abc\ndef\r\nghi');
    }
    // Test removing everything.
    {
      const l = new Lines(TEST);
      l.edit({ start: 0, end: 21 }, '');
      expect(l.text).toBe('');
    }
  });
});
