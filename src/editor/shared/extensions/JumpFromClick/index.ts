import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { jumpFromClickExtension } from './extension';
import { jumpFromClickPackage } from './package';

export const jumpFromClickEntry = defineExtension()(() => ({
  package: jumpFromClickPackage(),
  factory: () => jumpFromClickExtension,
}));
