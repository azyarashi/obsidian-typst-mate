export * from './extension';

import { defineExtension } from '@/libs/extensionManager';
import { tmActionsManager } from '@/libs/tmActionsManager';
import { buildActionExtensions } from './extension';
import { typstMateActionPackage } from './package';

export const typstMateActionEntry = defineExtension()(() => ({
  package: typstMateActionPackage(),
  factory: (_context, settings) => buildActionExtensions(tmActionsManager.actions, settings.longPressDuration),
}));
