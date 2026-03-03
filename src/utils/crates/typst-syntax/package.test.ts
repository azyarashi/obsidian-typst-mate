// https://github.com/typst/typst/blob/main/crates/typst-syntax/src/package.rs
import { describe, expect, it } from 'bun:test';
import { PackageSpec, PackageVersion } from './package';

describe('PackageVersion', () => {
  it('equals', () => {
    const v1 = new PackageVersion(1, 2, 3);
    const v2 = new PackageVersion(1, 2, 3);
    const v3 = new PackageVersion(1, 2, 4);
    expect(v1.equals(v2)).toBe(true);
    expect(v1.equals(v3)).toBe(false);
  });

  it('toString', () => {
    expect(new PackageVersion(0, 1, 0).toString()).toBe('0.1.0');
    expect(new PackageVersion(1, 2, 3).toString()).toBe('1.2.3');
  });
});

describe('PackageSpec', () => {
  it('equals', () => {
    const s1 = new PackageSpec('preview', 'package', new PackageVersion(0, 1, 0));
    const s2 = new PackageSpec('preview', 'package', new PackageVersion(0, 1, 0));
    const s3 = new PackageSpec('preview', 'other', new PackageVersion(0, 1, 0));
    expect(s1.equals(s2)).toBe(true);
    expect(s1.equals(s3)).toBe(false);
  });

  it('toString', () => {
    const spec = new PackageSpec('preview', 'package', new PackageVersion(0, 1, 0));
    expect(spec.toString()).toBe('@preview/package:0.1.0');
  });
});
