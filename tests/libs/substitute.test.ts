import { describe, expect, it } from 'bun:test';
import { CODE_PLACEHOLDER, substituteCode } from '../../src/libs/substitute';

// The shipped `fletcher` codeblock processor format string.
const FLETCHER_FORMAT = '#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge\n{CODE}';

/** The code half of a substitution result, i.e. everything after the format prefix. */
function substituted(source: string, useReplaceAll = false): string {
  const formatted = substituteCode(FLETCHER_FORMAT, source, useReplaceAll);

  return formatted.slice(formatted.indexOf('\n') + 1);
}

describe('substituteCode', () => {
  it('inserts ordinary source unchanged', () => {
    expect(substituted('#diagram(node((0, 0), $f$))')).toBe('#diagram(node((0, 0), $f$))');
  });

  // Each of these is a `String.prototype.replace` replacement pattern. Passing
  // the source as a replacement string rewrote them; a replacer function does not.
  it.each([
    ['an empty equation used as an invisible label', 'node((0, 0), $$)'],
    ['a dollar followed by an ampersand', 'node((0, 0), $&)'],
    ['a dollar followed by a backtick', 'node((0, 0), $` )'],
    ['a dollar followed by an apostrophe', "node((0, 0), $')"],
    ['a dollar followed by a digit', 'node((0, 0), $1)'],
    ['a dollar followed by an angle-bracketed name', 'node((0, 0), $<x>)'],
  ])('preserves %s', (_description, source) => {
    expect(substituted(source)).toBe(source);
  });

  it('preserves the placeholder itself when it appears in the source', () => {
    expect(substituted(`node((0, 0), [${CODE_PLACEHOLDER}])`)).toBe(`node((0, 0), [${CODE_PLACEHOLDER}])`);
  });

  it('replaces only the first placeholder by default', () => {
    expect(substituteCode('{CODE}|{CODE}', 'x')).toBe('x|{CODE}');
  });

  it('replaces every placeholder under useReplaceAll', () => {
    expect(substituteCode('{CODE}|{CODE}', 'x', true)).toBe('x|x');
  });

  it('preserves replacement patterns under useReplaceAll too', () => {
    expect(substituteCode('{CODE}|{CODE}', '$$', true)).toBe('$$|$$');
  });

  // Regression fixture: the diagram that shipped broken. Rendered by Obsidian it
  // produced "unclosed delimiter", because each `$$` reached Typst as a lone `$`.
  it('preserves every empty label in the PROP diagram that shipped broken', () => {
    const source = [
      '#diagram(',
      '  spacing: (1.9em, 2.0em),',
      '  node((1, 1), $f$, stroke: 0.5pt, inset: 5pt, shape: rect),',
      '  node((0, 0), $$), node((1, 0), $$), node((2, 0), $$),',
      '  node((0.5, 2), $$), node((1.5, 2), $$),',
      ')',
    ].join('\n');

    expect(substituted(source)).toBe(source);
    expect(substituted(source)).toContain('$$)');
  });
});
