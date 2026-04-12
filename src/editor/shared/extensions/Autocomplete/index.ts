import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { autocompleteExtension } from './extension';
import { autocompletePackage } from './package';

export const autocompleteEntry = defineExtension()(() => ({
  package: autocompletePackage(),
  factory: () => autocompleteExtension,
}));
