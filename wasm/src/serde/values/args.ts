import type { Arg, Args } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcBlock } from './utils';

export function formatArgs(val: Args): FormattedValue {
  return { top: wrapWithTypcBlock(val.repr) };
}

/*
function formatArg(a: Arg) {
  const positionalStr = a.is_positional ? ' #positional' : '';
  return `## ${a.name}${positionalStr}\n${wrapWithTypc(formatArgTypes(a, false))}\n${a.value.value.repr()}\n`;
}

function formatArgTypes(a: Arg) {
  const namedStr = a.name === undefined ? '..' : '';
  const typesStr =
    p.types.length <= 10
      ? p.types.map((t) => (t.type === 'any' ? 'any' : t.value)).join(' | ') // 短い場合は列挙
      : [...new Set(p.types.map((t) => t.type))].join(' | '); // 長い場合は型のみ
  const defaultStr = p.default ? ` = ${p.default}` : '';

  return `${variadicStr}${isSignature ? `${p.name}: ${typesStr}${defaultStr}` : `(${typesStr})`}`;
}
*/
