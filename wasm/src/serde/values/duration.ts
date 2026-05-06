import type { DurationValue as Duration } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatDuration(dur: Duration): FormattedValue {
  const parts: string[] = [];
  if (dur.weeks) parts.push(`${dur.weeks}w`);
  if (dur.days) parts.push(`${dur.days}d`);
  if (dur.hours) parts.push(`${dur.hours}h`);
  if (dur.minutes) parts.push(`${dur.minutes}m`);
  if (dur.seconds) parts.push(`${dur.seconds}s`);

  return { top: wrapWithTypcInline(`${parts.join(' ') || (dur.seconds === 0 ? '0s' : '')}`) };
}
