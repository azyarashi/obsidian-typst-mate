// https://github.com/typst/typst/blob/main/crates/typst-syntax/src/path.rs
import { describe, expect, it } from 'bun:test';
import { VirtualPath } from '@/utils/crates/typst-syntax/path';

describe('VirtualPath', () => {
  it('new', () => {
    expect(VirtualPath.new('').asRootedPath).toBe('/');
    expect(VirtualPath.new('a/./file.txt').asRootedPath).toBe('/a/file.txt');
    expect(VirtualPath.new('file.txt').asRootedPath).toBe('/file.txt');
    expect(VirtualPath.new('/file.txt').asRootedPath).toBe('/file.txt');
    expect(VirtualPath.new('hello/world').asRootedPath).toBe('/hello/world');
    expect(VirtualPath.new('hello/world/').asRootedPath).toBe('/hello/world');
    expect(VirtualPath.new('a///b').asRootedPath).toBe('/a/b');
    expect(VirtualPath.new('/a///b').asRootedPath).toBe('/a/b');
    expect(VirtualPath.new('./world.txt').asRootedPath).toBe('/world.txt');
    expect(VirtualPath.new('./world.txt/').asRootedPath).toBe('/world.txt');
    expect(VirtualPath.new('hello/.././/wor/ld.typ.extra').asRootedPath).toBe('/wor/ld.typ.extra');
  });

  it('asRootlessPath', () => {
    expect(VirtualPath.new('').asRootlessPath).toBe('');
    expect(VirtualPath.new('file.txt').asRootlessPath).toBe('file.txt');
    expect(VirtualPath.new('hello/world').asRootlessPath).toBe('hello/world');
  });

  it('join', () => {
    // TS join is sibling-relative (navigates from parent of last segment)
    const p1 = VirtualPath.new('src/main.typ');
    const p2 = p1.join('lib.typ');
    expect(p2.asRootedPath).toBe('/src/lib.typ');
    const p3 = p1.join('../other/file.typ');
    expect(p3.asRootedPath).toBe('/other/file.typ');
    const p4 = VirtualPath.new('file.typ');
    expect(p4.join('other.typ').asRootedPath).toBe('/other.typ');
    // Absolute path resets
    expect(p1.join('/abs/path.typ').asRootedPath).toBe('/abs/path.typ');
    // Empty join returns self
    expect(p1.join('').asRootedPath).toBe('/src/main.typ');
  });

  it('withExtension', () => {
    const p1 = VirtualPath.new('src/text/file.typ');
    expect(p1.withExtension('txt').asRootedPath).toBe('/src/text/file.txt');

    const p2 = VirtualPath.new('src');
    expect(p2.withExtension('txt').asRootedPath).toBe('/src.txt');

    const p3 = VirtualPath.new('');
    expect(p3.withExtension('txt').asRootedPath).toBe('/.txt');
  });
});
