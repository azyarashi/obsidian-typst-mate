import type { Angle } from '@/../pkg/typst_wasm';

export function formatAngle(angle: Angle): string {
  return `**angle:** \`${angle.deg}\` (${angle.rad})`;
}
