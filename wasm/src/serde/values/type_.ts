import type { Type } from '@/../pkg/typst_wasm';

export function formatType(type_: Type): string {
  return type_.docs;
}
