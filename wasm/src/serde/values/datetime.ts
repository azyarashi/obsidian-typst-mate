import type { DatetimeSer } from '@/../pkg/typst_wasm';

export function formatDatetime(dt: DatetimeSer): string {
  const date = `${dt.year}-${dt.month}-${dt.day}`;
  const time = `${dt.hour}:${dt.minute}:${dt.second}`;
  return `**datetime:** \`${date} ${time}\``;
}
