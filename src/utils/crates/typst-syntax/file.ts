import type { PackageSpec } from './package';
import type { VirtualPath } from './path';

const internerToId = new Map<string, FileId>();
const internerFromId: [PackageSpec | undefined, VirtualPath][] = [];

export class FileId {
  private constructor(public readonly id: number) {}

  public static new(package_: PackageSpec | undefined, path: VirtualPath): FileId {
    const pair = `${package_ ? package_.toString() : ''}::${path.asRootedPath}`;
    const existingId = internerToId.get(pair);
    if (existingId !== undefined) return existingId;

    const num = internerFromId.length + 1;

    const id = new FileId(num);
    internerToId.set(pair, id);
    internerFromId.push([package_, path]);
    return id;
  }

  public static newFake(path: VirtualPath): FileId {
    const num = internerFromId.length + 1;
    const id = new FileId(num);
    internerFromId.push([undefined, path]);
    return id;
  }

  public package(): PackageSpec | undefined {
    return internerFromId[this.id - 1]![0];
  }

  public vpath(): VirtualPath {
    return internerFromId[this.id - 1]![1];
  }

  public join(path: string): FileId {
    return FileId.new(this.package(), this.vpath().join(path));
  }

  public withExtension(extension: string): FileId {
    return FileId.new(this.package(), this.vpath().withExtension(extension));
  }

  public static fromRaw(v: number): FileId {
    return new FileId(v);
  }

  public intoRaw(): number {
    return this.id;
  }

  public equals(other: FileId): boolean {
    return this.id === other.id;
  }

  public toString(): string {
    const pkg = this.package();
    const vp = this.vpath().asRootedPath;
    if (pkg) return `${pkg.toString()}${vp}`;
    return vp;
  }
}
