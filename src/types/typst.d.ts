import type { PackageSpec } from '@wasm';

export type { PackageSpec };

export interface PackageSpecWithPath extends PackageSpec {
  path: string;
}
