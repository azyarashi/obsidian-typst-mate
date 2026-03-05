import { describe, expect, it } from 'bun:test';
import { parseMarkup } from '../../src/i18n/markup';

describe('parseMarkup', () => {
  it('returns plain text as a single text segment', () => {
    expect(parseMarkup('Hello world')).toEqual([{ type: 'text', content: 'Hello world' }]);
  });

  it('returns empty array for empty string', () => {
    expect(parseMarkup('')).toEqual([]);
  });

  it('parses bold tag', () => {
    expect(parseMarkup('<bold>important</bold>')).toEqual([{ type: 'bold', content: 'important' }]);
  });

  it('parses code tag', () => {
    expect(parseMarkup('<code>{CODE}</code>')).toEqual([{ type: 'code', content: '{CODE}' }]);
  });

  it('parses link tag with href', () => {
    expect(parseMarkup('<link href="https://github.com/azyarashi/obsidian-typst-mate/">click here</link>')).toEqual([
      { type: 'link', content: 'click here', href: 'https://github.com/azyarashi/obsidian-typst-mate/' },
    ]);
  });

  it('parses mixed content with text before and after tags', () => {
    expect(parseMarkup('Use <code>fontsize</code> as a value.')).toEqual([
      { type: 'text', content: 'Use ' },
      { type: 'code', content: 'fontsize' },
      { type: 'text', content: ' as a value.' },
    ]);
  });

  it('parses multiple tags in sequence', () => {
    expect(parseMarkup('start <bold>A</bold> and <code>B</code> end')).toEqual([
      { type: 'text', content: 'start ' },
      { type: 'bold', content: 'A' },
      { type: 'text', content: ' and ' },
      { type: 'code', content: 'B' },
      { type: 'text', content: ' end' },
    ]);
  });

  it('does not parse mismatched tags', () => {
    expect(parseMarkup('<bold>text</code>')).toEqual([{ type: 'text', content: '<bold>text</code>' }]);
  });

  it('treats link without href as plain text content', () => {
    expect(parseMarkup('<link>no href</link>')).toEqual([{ type: 'text', content: 'no href' }]);
  });

  it('treats nested tags as flat (inner markup becomes literal text)', () => {
    expect(parseMarkup('<bold><code>nested</code></bold>')).toEqual([{ type: 'bold', content: '<code>nested</code>' }]);
  });

  it('ignores non-whitelisted tags', () => {
    expect(parseMarkup('<script>alert(1)</script>')).toEqual([{ type: 'text', content: '<script>alert(1)</script>' }]);
  });

  it('does not capture extra attributes on whitelisted tags', () => {
    expect(parseMarkup('<bold onmouseover="alert(1)">text</bold>')).toEqual([
      { type: 'text', content: '<bold onmouseover="alert(1)">text</bold>' },
    ]);
  });
});
