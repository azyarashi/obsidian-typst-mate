import { defineExtension } from '@/libs/extensionManager';

export * from './extension';
export * from './package';

import { formatterPackage, formatterSettingsFacet } from './package';

export const formatterEntry = defineExtension()(() => ({
  package: formatterPackage(),
  factory: (_context, settings) => [formatterSettingsFacet.of(settings)],
}));
