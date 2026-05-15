import type { Migration } from './index';

export const migration: Migration = {
  version: undefined,
  next: '3.0.0',
  migrate: (oldSettings: any) => {
    return {
      ...oldSettings,
    };
  },
};
