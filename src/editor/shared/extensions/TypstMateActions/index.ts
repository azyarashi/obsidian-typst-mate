export * from './extension';

import { defineExtension } from '@/libs/extensionManager';
import { tmActionsManager } from '@/libs/tmActionsManager';
import { buildActionExtensions } from './extension';
import { typstMateActionsPackage } from './package';

export const typstMateActionsEntry = defineExtension()(() => ({
  package: typstMateActionsPackage(),
  factory: (_context, settings) => buildActionExtensions(tmActionsManager.actions, settings.longPressDuration),
}));
