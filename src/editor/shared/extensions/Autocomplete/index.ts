import { defineExtension } from '@/libs/extensionManager';
import { autocompleteExtension } from './extension';
import { autocompletePackage, autocompleteSettingsFacet } from './package';

export * from './extension';
export * from './package';

export const autocompleteEntry = defineExtension()(() => ({
  package: autocompletePackage(),
  factory: (_context, settings) => [autocompleteSettingsFacet.of(settings), autocompleteExtension],
}));
