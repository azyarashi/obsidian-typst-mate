import type { AngleSer } from '@/../pkg/typst_wasm';

export function formatAngle(angle: AngleSer): string {
  return `**angle:** \`${angle.deg}\` (${angle.rad})`;
}
