import { defineExtension } from '@/libs/extensionManager';

import { createSymbolConcealExtension } from './extension';
import { symbolConcealPackage, symbolConcealSettingsFacet } from './package';

export * from './extension';

export const symbolConcealEntry = defineExtension()(() => ({
  package: symbolConcealPackage(),
  factory: (_context, settings) => [
    symbolConcealSettingsFacet.of(settings),
    createSymbolConcealExtension(symbolConcealSettingsFacet),
  ],
}));
