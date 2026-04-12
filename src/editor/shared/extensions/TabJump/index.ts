import { defineExtension } from '@/libs/extensionManager';
import { createTabJumpExtension } from './extension';
import { tabJumpPackage, tabJumpSettingsFacet } from './package';

export * from './extension';
export * from './tabstop';

export const tabJumpEntry = defineExtension()(() => ({
  package: tabJumpPackage(),
  factory: (_context, settings) => [tabJumpSettingsFacet.of(settings), createTabJumpExtension(tabJumpSettingsFacet)],
}));
