export interface Line {
  byteIdx: number;
  utf16Idx: number;
}

export function isNewline(c: number): boolean {
  return c === 0x0a || c === 0x0b || c === 0x0c || c === 0x0d || c === 0x85 || c === 0x2028 || c === 0x2029;
}

export function lenUtf8(str: string): number {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) len += 1;
    else if (code < 0x800) len += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      len += 4;
      i++;
    } else len += 3;
  }
  return len;
}

export function lenUtf16(str: string): number {
  return str.length;
}

export function charLenUtf8(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Returns the UTF-16 code unit length of a single character given its code point.
 */
export function charLenUtf16(codePoint: number): number {
  return codePoint >= 0x10000 ? 2 : 1;
}

export class Lines {
  private lines: Line[];
  private _text: string;

  constructor(text: string) {
    this._text = text;
    this.lines = Lines.computeLines(text);
  }

  public get text(): string {
    return this._text;
  }

  public lenBytes(): number {
    return lenUtf8(this._text);
  }

  public lenUtf16(): number {
    return this._text.length;
  }

  public lenLines(): number {
    return this.lines.length;
  }

  public byteToUtf16(byteIdx: number): number | undefined {
    const lineIdx = this.byteToLine(byteIdx);
    if (lineIdx === undefined) return undefined;
    const line = this.lines[lineIdx];
    if (!line) return undefined;

    let currentByte = line.byteIdx;
    let currentUtf16 = line.utf16Idx;

    for (let i = currentUtf16; i < this._text.length; i++) {
      if (currentByte >= byteIdx) return currentUtf16;
      const code = this._text.charCodeAt(i);
      let point = code;
      let utf16Delta = 1;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < this._text.length) {
        const next = this._text.charCodeAt(i + 1);
        point = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        utf16Delta = 2;
      }
      currentByte += charLenUtf8(point);
      currentUtf16 += utf16Delta;
      if (utf16Delta === 2) i++;
    }

    return currentByte === byteIdx ? currentUtf16 : undefined;
  }

  public byteToLine(byteIdx: number): number | undefined {
    let low = 0;
    let high = this.lines.length - 1;
    let ans = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const midLine = this.lines[mid];
      if (midLine && midLine.byteIdx <= byteIdx) {
        ans = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (ans === -1) return undefined;
    return byteIdx <= this.lenBytes() ? ans : undefined;
  }

  public byteToColumn(byteIdx: number): number | undefined {
    const lineIdx = this.byteToLine(byteIdx);
    if (lineIdx === undefined) return undefined;
    const start = this.lineToByte(lineIdx);
    if (start === undefined) return undefined;
    const lineObj = this.lines[lineIdx];
    if (!lineObj) return undefined;

    let currentByte = start;
    const currentUtf16 = lineObj.utf16Idx;
    let chars = 0;

    for (let i = currentUtf16; i < this._text.length; i++) {
      if (currentByte >= byteIdx) return chars;
      const code = this._text.charCodeAt(i);
      let point = code;
      let utf16Delta = 1;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < this._text.length) {
        const next = this._text.charCodeAt(i + 1);
        point = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        utf16Delta = 2;
      }
      currentByte += charLenUtf8(point);
      chars++;
      if (utf16Delta === 2) i++;
    }

    return currentByte === byteIdx ? chars : undefined;
  }

  public byteToLineColumn(byteIdx: number): [number, number] | undefined {
    const lineIdx = this.byteToLine(byteIdx);
    if (lineIdx === undefined) return undefined;
    const col = this.byteToColumn(byteIdx);
    if (col === undefined) return undefined;
    return [lineIdx, col];
  }

  public utf16ToByte(utf16Idx: number): number | undefined {
    let low = 0;
    let high = this.lines.length - 1;
    let ans = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const midLine = this.lines[mid];
      if (midLine && midLine.utf16Idx <= utf16Idx) {
        ans = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (ans === -1) return undefined;
    const line = this.lines[ans];
    if (!line) return undefined;

    let currentByte = line.byteIdx;
    let currentUtf16 = line.utf16Idx;

    for (let i = currentUtf16; i < this._text.length; i++) {
      if (currentUtf16 >= utf16Idx) return currentByte;
      const code = this._text.charCodeAt(i);
      let point = code;
      let utf16Delta = 1;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < this._text.length) {
        const next = this._text.charCodeAt(i + 1);
        point = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        utf16Delta = 2;
      }
      currentByte += charLenUtf8(point);
      currentUtf16 += utf16Delta;
      if (utf16Delta === 2) i++;
    }

    return currentUtf16 === utf16Idx ? currentByte : undefined;
  }

  public lineToByte(lineIdx: number): number | undefined {
    if (lineIdx < 0 || lineIdx >= this.lines.length) return undefined;
    const line = this.lines[lineIdx];
    if (!line) return undefined;
    return line.byteIdx;
  }

  public lineToRange(lineIdx: number): { start: number; end: number } | undefined {
    const start = this.lineToByte(lineIdx);
    if (start === undefined) return undefined;
    const end = this.lineToByte(lineIdx + 1);
    return { start, end: end === undefined ? this.lenBytes() : end };
  }

  public lineColumnToByte(lineIdx: number, columnIdx: number): number | undefined {
    const range = this.lineToRange(lineIdx);
    if (range === undefined) return undefined;
    const lineObj = this.lines[lineIdx];
    if (!lineObj) return undefined;

    const startUtf16 = lineObj.utf16Idx;
    let currentByte = range.start;
    let chars = 0;

    for (let i = startUtf16; i < this._text.length; i++) {
      if (chars >= columnIdx) return currentByte;
      if (currentByte >= range.end) break;

      const code = this._text.charCodeAt(i);
      let point = code;
      let utf16Delta = 1;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < this._text.length) {
        const next = this._text.charCodeAt(i + 1);
        point = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        utf16Delta = 2;
      }
      currentByte += charLenUtf8(point);
      chars++;
      if (utf16Delta === 2) i++;
    }

    return chars === columnIdx ? currentByte : undefined;
  }

  public replace(newText: string): boolean {
    const range = this.replacementRange(newText);
    if (range === undefined) return false;

    const prefix = range[0];
    const suffix = range[1];

    const replaceStart = prefix;
    const replaceEnd = this.lenBytes() - suffix;
    const withText = newText.slice(
      this.byteToUtf16(prefix)!,
      newText.length - this.byteToUtf16(this.lenBytes() - suffix)!,
    );

    this.edit({ start: replaceStart, end: replaceEnd }, withText);
    return true;
  }

  public edit(replace: { start: number; end: number }, withText: string) {
    const startByte = replace.start;
    const startUtf16 = this.byteToUtf16(startByte)!;
    const endUtf16 = this.byteToUtf16(replace.end)!;
    const line = this.byteToLine(startByte)!;

    this._text = this._text.slice(0, startUtf16) + withText + this._text.slice(endUtf16);

    this.lines = this.lines.slice(0, line + 1);

    if (startByte > 0 && this._text.charCodeAt(startUtf16 - 1) === 0x0d && withText.charCodeAt(0) === 0x0a) {
      this.lines.pop();
    }

    const newLines = Lines.linesFrom(startByte, startUtf16, this._text.slice(startUtf16));
    this.lines.push(...newLines);
  }

  public replacementRange(newText: string): [number, number] | undefined {
    if (this._text === newText) return undefined;

    let prefixUtf16 = 0;
    while (
      prefixUtf16 < this._text.length &&
      prefixUtf16 < newText.length &&
      this._text[prefixUtf16] === newText[prefixUtf16]
    )
      prefixUtf16++;

    while (prefixUtf16 > 0 && this.isSurrogate(this._text.charCodeAt(prefixUtf16))) prefixUtf16--;

    let suffixUtf16Old = this._text.length;
    let suffixUtf16New = newText.length;
    while (
      suffixUtf16Old > prefixUtf16 &&
      suffixUtf16New > prefixUtf16 &&
      this._text[suffixUtf16Old - 1] === newText[suffixUtf16New - 1]
    ) {
      suffixUtf16Old--;
      suffixUtf16New--;
    }

    while (suffixUtf16Old < this._text.length && this.isSurrogate(this._text.charCodeAt(suffixUtf16Old)))
      suffixUtf16Old++;

    const prefixByte = lenUtf8(this._text.slice(0, prefixUtf16));
    const suffixByte = lenUtf8(this._text.slice(suffixUtf16Old));

    return [prefixByte, suffixByte];
  }

  private isSurrogate(code: number): boolean {
    return code >= 0xdc00 && code <= 0xdfff;
  }

  private static computeLines(text: string): Line[] {
    const lines: Line[] = [{ byteIdx: 0, utf16Idx: 0 }];
    lines.push(...Lines.linesFrom(0, 0, text));
    return lines;
  }

  private static linesFrom(byteOffset: number, utf16Offset: number, text: string): Line[] {
    const lines: Line[] = [];
    let currentByte = byteOffset;
    let currentUtf16 = utf16Offset;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      let point = code;
      let utf16Delta = 1;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        point = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        utf16Delta = 2;
      }

      const byteLen = charLenUtf8(point);
      currentByte += byteLen;
      currentUtf16 += utf16Delta;

      if (isNewline(point)) {
        if (point === 0x0d && i + 1 < text.length && text.charCodeAt(i + 1) === 0x0a) {
          // \r\n
          currentByte += 1; // +1 byte for \n
          currentUtf16 += 1;
          i++; // skip \n
        }
        lines.push({ byteIdx: currentByte, utf16Idx: currentUtf16 });
      }

      if (utf16Delta === 2) i++; // サロゲートペア
    }

    return lines;
  }
}
