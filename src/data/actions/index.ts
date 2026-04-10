import SHORTCUTS_DATA from '@/data/actions/long-press.json';
import TYPE_DATA from '@/data/actions/type.json';
import type { ActionDef } from '@/libs/action';

export const DEFAULT_ACTIONS: ActionDef[] = [
  // type
  ...TYPE_DATA,

  // long-press
  ...Object.entries(SHORTCUTS_DATA).map(
    ([key, data]): ActionDef => ({
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
