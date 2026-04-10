import type { TypeSer } from '@/../pkg/typst_wasm';

export function formatType(type_: TypeSer): string {
  return type_.docs;
}
