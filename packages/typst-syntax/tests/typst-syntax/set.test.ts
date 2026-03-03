// https://github.com/typst/typst/blob/main/crates/typst-syntax/src/set.rs
import { describe, expect, it } from 'bun:test';
import { SyntaxKind } from '@/typst-syntax/kind';
import { SyntaxSet } from '@/typst-syntax/set';

describe('SyntaxSet', () => {
  it('add and contains', () => {
    let set = SyntaxSet.empty();
    set = SyntaxSet.add(set, SyntaxKind.And);
    set = SyntaxSet.add(set, SyntaxKind.Or);
    expect(SyntaxSet.contains(set, SyntaxKind.And)).toBe(true);
    expect(SyntaxSet.contains(set, SyntaxKind.Or)).toBe(true);
    expect(SyntaxSet.contains(set, SyntaxKind.Not)).toBe(false);
  });
});
