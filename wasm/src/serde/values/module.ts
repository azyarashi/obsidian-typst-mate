import type { Module } from '@/../pkg/typst_wasm';

export function formatModule(mod: Module): string {
  return `**module:** ${mod.name}\n\n**exports:** ${mod.exports.join(', ')}`;
}
