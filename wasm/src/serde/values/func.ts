import type { Func, Param } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcBlock } from './utils';

export function formatFunc(func: Func): FormattedValue {
  // * top
  let top: string | undefined;
  if (func.params) {
    const signatureParams = func.params
      .map((p) => {
        return `  ${formatParamTypes(p, true)},`;
      })
      .join('\n');

    top = wrapWithTypcBlock(`${func.name}(\n${signatureParams}\n)`);
  }

  // * bottom
  let bottom = '';
  const positional = func.params?.filter((p) => p.positional) || [];
  const named = func.params?.filter((p) => p.named) || [];

  if (0 < named.length) {
    bottom += '# Named Parameters\n';
    for (const p of named) bottom += formatParam(p);
  }

  if (0 < positional.length) {
    bottom += '# Positional Parameters\n';
    for (const p of positional) bottom += formatParam(p);
  }

  // * return
  return { top, bottom };
}

function formatParam(p: Param) {
  const requiredStr = p.required ? ' #required' : '';
  const settableStr = p.settable ? ' #settable' : '';
  return `## ${p.name}${requiredStr}${settableStr}\n${wrapWithTypcBlock(formatParamTypes(p, false))}\n${p.docs}\n`;
}

function formatParamTypes(p: Param, isSignature: boolean) {
  const variadicStr = p.variadic ? '..' : '';
  const typesStr =
    p.types.length <= 10
      ? p.types.map((t) => (t.type === 'any' ? 'any' : t.value)).join(' | ') // 短い場合は列挙
      : [...new Set(p.types.map((t) => t.type))].join(' | '); // 長い場合は型のみ
  const defaultStr = p.default ? ` = ${p.default}` : '';

  return `${variadicStr}${isSignature ? `${p.name}: ${typesStr}${defaultStr}` : `(${typesStr})`}`;
}
