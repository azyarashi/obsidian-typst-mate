export class PackageVersion {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
  ) {}

  public equals(other: PackageVersion): boolean {
    return this.major === other.major && this.minor === other.minor && this.patch === other.patch;
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}

export class PackageSpec {
  constructor(
    public readonly namespace: string,
    public readonly name: string,
    public readonly version: PackageVersion,
  ) {}

  public equals(other: PackageSpec): boolean {
    return this.namespace === other.namespace && this.name === other.name && this.version.equals(other.version);
  }

  public toString(): string {
    return `@${this.namespace}/${this.name}:${this.version.toString()}`;
  }
}
