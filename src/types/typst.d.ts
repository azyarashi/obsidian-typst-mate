import type { PackageSpec } from '@wasm';
import type { TarFile } from './untar-sync';

export type { PackageSpec };

export interface PackageSpecWithPath extends PackageSpec {
  path: string;
}

export type PackageAsset = TarFile[];
