import { CLASSES, type MathClass } from './classes.ts';

export function class_(c: string): MathClass | undefined {
  let lo = 0;
  let hi = CLASSES.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const entry = CLASSES[mid];
    if (!entry) break;
    const [ch, cls] = entry;

    if (ch < c) lo = mid + 1;
    else if (ch > c) hi = mid - 1;
    else return cls;
  }

  return undefined;
}
