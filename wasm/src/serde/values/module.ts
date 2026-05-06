import type { Module } from '@wasm';
import type { FormattedValue } from './types';

export function formatModule(mod: Module): FormattedValue {
  return { top: `**module:** ${mod.name}\n\n**exports:** ${mod.exports.join(', ')}` };
}
