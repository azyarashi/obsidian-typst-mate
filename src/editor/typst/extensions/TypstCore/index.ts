import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { typstTextCore } from './extension';
import { typstCorePackage } from './package';

export const typstCoreEntry = defineExtension()(() => ({
  package: typstCorePackage(),
  factory: () => typstTextCore,
}));
