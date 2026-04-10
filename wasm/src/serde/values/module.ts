import type { ModuleSer } from '@/../pkg/typst_wasm';

export function formatModule(mod: ModuleSer): string {
  return `**module:** ${mod.name}\n\n**exports:** ${mod.exports.join(', ')}`;
}
