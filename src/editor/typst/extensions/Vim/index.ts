import { defineExtension } from '@/libs/extensionManager';
import { vimExtension } from './extension';
import { vimPackage } from './package';

export { type VimStatusState, vimModeField, vimQuitFacet, vimSaveFacet } from './extension';

export const vimEntry = defineExtension()(() => ({
  package: vimPackage(),
  factory: () => vimExtension,
}));
