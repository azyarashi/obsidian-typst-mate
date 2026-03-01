export class VirtualPath {
  public static readonly root = new VirtualPath('/');

  private constructor(private readonly _path: string) {}

  public get asRootedPath(): string {
    return this._path;
  }

  public get asRootlessPath(): string {
    return this._path === '/' ? '' : this._path.slice(1);
  }

  public join(path: string): VirtualPath {
    if (path.length === 0) return this;
    if (path.startsWith('/')) {
      return VirtualPath.new(path);
    }

    const parts = this._path === '/' ? [] : this._path.split('/').filter(Boolean);
    const newParts = path.split('/').filter(Boolean);

    const parentParts = parts.slice(0, parts.length > 0 ? parts.length - 1 : 0);

    for (const part of newParts) {
      if (part === '.') continue;
      if (part === '..') {
        if (parentParts.length > 0) parentParts.pop();
        continue;
      }
      parentParts.push(part);
    }

    return new VirtualPath('/' + parentParts.join('/'));
  }

  public withExtension(extension: string): VirtualPath {
    const lastSlash = this._path.lastIndexOf('/');
    const lastDot = this._path.lastIndexOf('.');

    if (lastDot > lastSlash) {
      return new VirtualPath(this._path.slice(0, lastDot) + '.' + extension);
    } else {
      return new VirtualPath(this._path + '.' + extension);
    }
  }

  public static new(path: string): VirtualPath {
    const parts = path.split('/').filter(Boolean);
    const out: string[] = [];

    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (out.length > 0) {
          out.pop();
        }
      } else {
        out.push(part);
      }
    }

    return new VirtualPath('/' + out.join('/'));
  }

  public toString(): string {
    return this._path;
  }
}
