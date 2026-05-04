import { describe, expect, it } from 'bun:test';
import { hashLike } from '@/utils/hashLike';

describe('hashLike', () => {
  it('handles empty string', () => {
    expect(hashLike('')).toHaveLength(6);
  });

  it('returns a string of default length 6', () => {
    expect(hashLike('hello')).toHaveLength(6);
  });

  it('returns a string of custom length', () => {
    expect(hashLike('hello', 10)).toHaveLength(10);
  });

  it('returns deterministic output for the same input', () => {
    expect(hashLike('test')).toBe(hashLike('test'));
  });

  it('returns different output for different inputs', () => {
    expect(hashLike('foo')).not.toBe(hashLike('bar'));
  });
});
