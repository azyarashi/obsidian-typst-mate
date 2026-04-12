import SHORTCUTS_DATA from '@/data/actions/long-press.json';
import TYPE_DATA from '@/data/actions/type.json';
import type { Action } from '@/libs/action';

export const DEFAULT_ACTIONS: Action[] = [
  // type
  ...TYPE_DATA,

  // long-press
  ...Object.entries(SHORTCUTS_DATA).map(
    ([key, data]): Action => ({
      id: `Long Press ${key}`,
      contexts: ['Math'],
      trigger: {
        t: 'long-press',
        v: key,
      },
      action: {
        t: 'snippet',
        v: data.content,
      },
    }),
  ),
];
