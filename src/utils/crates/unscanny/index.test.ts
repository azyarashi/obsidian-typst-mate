// https://github.com/typst/unscanny/blob/v0.1/src/lib.rs
import { describe, expect, it } from 'vitest';
import { Scanner } from './index';

describe('Scanner', () => {
  // fmt is implemented as toString in TypeScript.
  it('fmt', () => {
    const s = new Scanner('hello world');
    expect(s.toString()).toBe('Scanner(| "hello world")');
    s.eatWhile((c) => /\p{L}/u.test(c));
    expect(s.toString()).toBe('Scanner("hello" | " world")');
    s.eatWhile(() => true);
    expect(s.toString()).toBe('Scanner("hello world" |)');
  });

  it('empty', () => {
    const s = new Scanner('');
    s.jump(10);
    expect(s.cursor).toBe(0);
    expect(s.done()).toBe(true);
    expect(s.before()).toBe('');
    expect(s.after()).toBe('');
    expect(s.from(0)).toBe('');
    expect(s.from(10)).toBe('');
    expect(s.to(10)).toBe('');
    expect(s.get(10, 20)).toBe('');
    expect(s.at('')).toBe(true);
    expect(s.at('a')).toBe(false);
    expect(s.at(() => true)).toBe(false);
    expect(s.scout(-1)).toBe('');
    expect(s.scout(1)).toBe('');
    expect(s.locate(-1)).toBe(0);
    expect(s.locate(0)).toBe(0);
    expect(s.locate(1)).toBe(0);
    expect(s.eat()).toBeNull();
    expect(s.uneat()).toBeNull();
    expect(s.eatIf('')).toBe(true);
    expect(s.eatIf('a')).toBe(false);
    expect(s.eatWhile('')).toBe('');
    expect(s.eatUntil('')).toBe('');
    expect(s.eatWhile('a')).toBe('');
    expect(s.eatUntil('a')).toBe('');
    expect(s.eatWhitespace()).toBe('');
  });

  it('slice', () => {
    const s = new Scanner('zoo Ђ party');
    expect(s.parts()).toEqual(['', 'zoo Ђ party']);
    expect(s.get(2, 5)).toBe('o Ђ');
    expect(s.get(2, 22)).toBe('o Ђ party');
    s.eatWhile((c) => c.charCodeAt(0) <= 0x7f);
    expect(s.parts()).toEqual(['zoo ', 'Ђ party']);
    expect(s.from(1)).toBe('oo ');
    expect(s.to(6)).toBe('Ђ ');
    expect(s.to(8)).toBe('Ђ pa');
    expect(s.to(Number.MAX_SAFE_INTEGER)).toBe('Ђ party');
    s.eatUntil((c) => /\s/.test(c));
    expect(s.parts()).toEqual(['zoo Ђ', ' party']);
    expect(s.from(3)).toBe(' Ђ');
  });

  it('done and peek', () => {
    const s = new Scanner('äbc');
    expect(s.done()).toBe(false);
    expect(s.peek()).toBe('ä');
    s.eat();
    expect(s.done()).toBe(false);
    expect(s.peek()).toBe('b');
    s.eat();
    expect(s.done()).toBe(false);
    expect(s.peek()).toBe('c');
    s.eat();
    expect(s.done()).toBe(true);
    expect(s.peek()).toBe('');
  });

  it('at', () => {
    const s = new Scanner('Ђ12');
    expect(s.at('Ђ')).toBe(true);
    expect(s.at(['b', 'Ђ', 'Њ'])).toBe(true);
    expect(s.at('Ђ1')).toBe(true);
    expect(s.at((c) => /\p{L}/u.test(c))).toBe(true);
    expect(s.at(['b', 'c'])).toBe(false);
    expect(s.at('a13')).toBe(false);
    expect(s.at((c) => /[0-9]/.test(c))).toBe(false);
    s.eat();
    expect(s.at((c) => /[0-9]/.test(c))).toBe(true);
    expect(s.at((c) => /[0-9]/.test(c))).toBe(true);
  });

  it('scout and locate', () => {
    const s = new Scanner('abcd1Ф');
    s.eatUntil((c) => /[0-9]/.test(c));
    expect(s.scout(-5)).toBe('');
    expect(s.scout(-4)).toBe('a');
    expect(s.scout(-3)).toBe('b');
    expect(s.scout(-2)).toBe('c');
    expect(s.scout(-1)).toBe('d');
    expect(s.scout(0)).toBe('1');
    expect(s.scout(1)).toBe('Ф');
    expect(s.scout(2)).toBe('');
    expect(s.locate(-5)).toBe(0);
    expect(s.locate(-4)).toBe(0);
    expect(s.locate(-3)).toBe(1);
    expect(s.locate(-2)).toBe(2);
    expect(s.locate(-1)).toBe(3);
    expect(s.locate(0)).toBe(4);
    expect(s.locate(1)).toBe(5);
    expect(s.locate(2)).toBe(6);
    expect(s.locate(3)).toBe(6);
  });

  it('eat and uneat', () => {
    const s = new Scanner('abc');
    expect(s.eat()).toBe('a');
    expect(s.eat()).toBe('b');
    expect(s.eat()).toBe('c');
    expect(s.eat()).toBeNull();
    expect(s.uneat()).toBe('c');
    expect(s.uneat()).toBe('b');
    expect(s.uneat()).toBe('a');
    expect(s.uneat()).toBeNull();
    expect(s.eat()).toBe('a');
  });

  it('conditional and looping', () => {
    const s = new Scanner('abc123def33');
    expect(s.eatIf('b')).toBe(false);
    expect(s.eatIf('a')).toBe(true);
    expect(s.eatWhile((c) => 'bc'.includes(c))).toBe('bc');
    expect(s.eatWhile((c) => /[0-9]/.test(c))).toBe('123');
    expect(s.eatUntil((c) => /[0-9]/.test(c))).toBe('def');
    expect(s.eatWhile('3')).toBe('33');
  });

  it('multi-char string patterns', () => {
    const s = new Scanner('abababc');
    expect(s.eatWhile('ab')).toBe('ababab');
    expect(s.after()).toBe('c');

    const s2 = new Scanner('xxxabyyy');
    expect(s2.eatUntil('ab')).toBe('xxx');
    expect(s2.after()).toBe('abyyy');
  });

  it('eat whitespace', () => {
    const s = new Scanner('ሙም  \n  b\tቂ');
    expect(s.eatWhitespace()).toBe('');
    expect(s.eatWhile((c) => /\p{L}/u.test(c))).toBe('ሙም');
    expect(s.eatWhitespace()).toBe('  \n  ');
    expect(s.eatIf('b')).toBe(true);
    expect(s.eatWhitespace()).toBe('\t');
    expect(s.eatWhile((c) => /\p{L}/u.test(c))).toBe('ቂ');
  });

  it('expect okay', () => {
    const s = new Scanner('🦚12');
    s.expect('🦚');
    expect(s.after()).toBe('12');
  });

  it('expect str fail', () => {
    const s = new Scanner('no turtle in sight');
    expect(() => s.expect('🐢')).toThrow();
  });
});
