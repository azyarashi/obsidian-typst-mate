export * from './actions';
export * from './extension';
export * from './extras';

import { defineExtension } from '@/managers/extensionManager';
import { tmActionsManager } from '@/managers/tmActionsManager';
import { buildActionExtensions } from './extension';
import { typstMateActionsPackage } from './package';

export const typstMateActionsEntry = defineExtension()(() => ({
  package: typstMateActionsPackage(),
  factory: (_context, settings) => buildActionExtensions(tmActionsManager.actions, settings.longPressDuration),
}));
