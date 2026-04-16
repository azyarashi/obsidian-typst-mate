import type { PackageSpec } from '@/../pkg/typst_wasm';

export interface PackageSpecWithPath extends PackageSpec {
  path: string;
}
