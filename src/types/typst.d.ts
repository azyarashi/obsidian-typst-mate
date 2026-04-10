/**
 * - version: `{major}.{minor}.{patch}`
 */
export interface PackageSpec {
  namespace: string;
  name: string;
  version: string;
}

export interface PackageSpecWithPath extends PackageSpec {
  path: string;
}
