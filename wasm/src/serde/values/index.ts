import type { Definition, Jump, Str, Value } from '@/../pkg/typst_wasm';

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

export function formatInt(v: number): string {
  return `**int(Integer):** \`${v}\``;
}

export function formatFloat(v: number): string {
  return `**float(Float):** \`${v}\``;
}

export function formatBool(v: boolean): string {
  return `**bool(Boolean):** \`${v}\``;
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

export function formatDefinitionValue(v: Value | { type: 'span'; value: Jump }): string {
  switch (v.type) {
    case 'Angle': return formatAngle(v.value);
    case 'Args': return formatArgs(v.value);
    case 'Array': return formatArray(v.value);
    case 'Auto': return formatAuto();
    case 'Bool': return formatBool(v.value);
    case 'Bytes': return formatBytes(v.value);
    case 'Color': return formatColor(v.value);
    case 'Content': return formatContent(v.value);
    case 'Datetime': return formatDatetime(v.value);
    case 'Decimal': return formatDecimal(v.value);
    case 'Dict': return formatDict(v.value);
    case 'Duration': return formatDuration(v.value);
    case 'Dyn': return formatDyn(v.value);
    case 'Float': return formatFloat(v.value);
    case 'Fraction': return formatFraction(v.value);
    case 'Func': return formatFunc(v.value);
    case 'Gradient': return formatGradient(v.value);
    case 'Int': return formatInt(v.value);
    case 'Label': return formatLabel(v.value);
    case 'Length': return formatLength(v.value);
    case 'Module': return formatModule(v.value);
    case 'None': return formatNone();
    case 'Ratio': return formatRatio(v.value);
    case 'Relative': return formatRelative(v.value);
    case 'Str': return formatStr(v.value);
    case 'Styles': return formatStyles(v.value);
    case 'Symbol': return formatSymbol(v.value);
    case 'Tiling': return formatTiling(v.value);
    case 'Type': return formatType(v.value);
    case 'Version': return formatVersion(v.value);
    case 'span': return formatSpan(v.value);
    default: return 'Unknown value';
  }
}
