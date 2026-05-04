import { describe, expect, it } from 'bun:test';
import { expandHierarchicalTags } from '@/utils/tags';

describe('expandHierarchicalTags', () => {
  it('returns empty set for empty input', () => {
    expect(expandHierarchicalTags([])).toEqual(new Set());
  });

  it('expands a single tag without slash', () => {
    expect(expandHierarchicalTags(['#math'])).toEqual(new Set(['math']));
  });

  it('expands a nested tag into all ancestors', () => {
    expect(expandHierarchicalTags(['#a/b/c'])).toEqual(new Set(['a', 'a/b', 'a/b/c']));
  });

  it('expands a single tags and nested tags', () => {
    expect(expandHierarchicalTags(['#x', '#y/z'])).toEqual(new Set(['x', 'y', 'y/z']));
  });

  it('deduplicates overlapping hierarchies', () => {
    expect(expandHierarchicalTags(['#a/b', '#a/b/c'])).toEqual(new Set(['a', 'a/b', 'a/b/c']));
  });
});
