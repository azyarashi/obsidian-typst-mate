import type { DurationSer } from '@/../pkg/typst_wasm';

export function formatDuration(dur: DurationSer): string {
  const parts: string[] = [];
  if (dur.weeks) parts.push(`${dur.weeks}w`);
  if (dur.days) parts.push(`${dur.days}d`);
  if (dur.hours) parts.push(`${dur.hours}h`);
  if (dur.minutes) parts.push(`${dur.minutes}m`);
  if (dur.seconds) parts.push(`${dur.seconds}s`);
  
  return `**duration:** \`${parts.join(' ') || (dur.seconds === 0 ? '0s' : '')}\``;
}
