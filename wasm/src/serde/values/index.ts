import type { Definition, DefinitionValue, Jump, Str } from '@/../pkg/typst_wasm';

import { formatAngle } from './angle';
import { formatArgs } from './args';
import { formatArray } from './array';
import { formatBytes } from './bytes';
import { formatColor } from './color';
import { formatContent } from './content';
import { formatDatetime } from './datetime';
import { formatDecimal } from './decimal';
import { formatDict } from './dict';
import { formatDuration } from './duration';
import { formatDyn } from './dyn';
import { formatFraction } from './fraction';
import { formatFunc } from './func';
import { formatGradient } from './gradient';
import { formatLabel } from './label';
import { formatLength } from './length';
import { formatModule } from './module';
import { formatRatio } from './ratio';
import { formatRelative } from './relative';
import { formatStyles } from './styles';
import { formatSymbol } from './symbol';
import { formatTiling } from './tiling';
import { formatType } from './type_';
import { formatVersion } from './version';

export * from './angle';
export * from './args';
export * from './array';
export * from './bytes';
export * from './color';
export * from './content';
export * from './datetime';
export * from './decimal';
export * from './dict';
export * from './duration';
export * from './dyn';
export * from './fraction';
export * from './func';
export * from './gradient';
export * from './label';
export * from './length';
export * from './module';
export * from './ratio';
export * from './relative';
export * from './styles';
export * from './symbol';
export * from './tiling';
export * from './type_';
export * from './version';

export function formatInt(v: { value: number }): string {
  return `**int(Integer):** \`${v.value}\``;
}

export function formatFloat(v: { value: number }): string {
  return `**float(Float):** \`${v.value}\``;
}

export function formatBool(v: { value: boolean }): string {
  return `**bool(Boolean):** \`${v.value}\``;
}

export function formatAuto(): string {
  return '`auto`';
}

export function formatNone(): string {
  return '`none`';
}

export function formatStr(v: Str): string {
  return `**string:** \`"${v.value}"\``;
}

export function formatSpan(v: Jump): string {
  if (v.type === 'file') {
    const pkg = v.package ? ` (package: \`${v.package}\`)` : '';
    return `**definition:** points to \`${v.path}\`${pkg}`;
  } else if (v.type === 'url') {
    return `**url:** [${v.url}](${v.url})`;
  } else if (v.type === 'position') {
    return `**position:** page ${v.page}, x: ${v.x.toFixed(1)}pt, y: ${v.y.toFixed(1)}pt`;
  }

  return '';
}

export function formatOrigin(v: Definition): string {
  let text = `${v.value.type}`

  const origin = v.origin;
  switch (origin.type) {
    case 'builtIn':
      text += ' built-in';
      break;
    case 'package':
      text += ` package (\`${origin.value.name}\`) @ \`${origin.value.path}\``;
      break;
    case 'user':
      text += origin.value.this ? ' user' : ` user (\`${origin.value.path}\`)`;
      break;
    default:
      break;
  }

  return text;
}

export function formatDefinition(v: Definition): string {
  return formatDefinitionValue(v.value);
}

export function formatDefinitionValue(v: DefinitionValue): string {
  switch (v.type) {
    case 'angle': return formatAngle(v.value);
    case 'args': return formatArgs(v.value);
    case 'array': return formatArray(v.value);
    case 'auto': return formatAuto();
    case 'bool': return formatBool(v.value);
    case 'bytes': return formatBytes(v.value);
    case 'color': return formatColor(v.value);
    case 'content': return formatContent(v.value);
    case 'datetime': return formatDatetime(v.value);
    case 'decimal': return formatDecimal(v.value);
    case 'dict': return formatDict(v.value);
    case 'duration': return formatDuration(v.value);
    case 'dyn': return formatDyn(v.value);
    case 'float': return formatFloat(v.value);
    case 'fraction': return formatFraction(v.value);
    case 'func': return formatFunc(v.value);
    case 'gradient': return formatGradient(v.value);
    case 'int': return formatInt(v.value);
    case 'label': return formatLabel(v.value);
    case 'length': return formatLength(v.value);
    case 'module': return formatModule(v.value);
    case 'none': return formatNone();
    case 'ratio': return formatRatio(v.value);
    case 'relative': return formatRelative(v.value);
    case 'str': return formatStr(v.value);
    case 'styles': return formatStyles(v.value);
    case 'symbol': return formatSymbol(v.value);
    case 'tiling': return formatTiling(v.value);
    case 'type': return formatType(v.value);
    case 'version': return formatVersion(v.value);
    case 'span': return formatSpan(v.value);
    default: return 'Unknown value';
  }
}
