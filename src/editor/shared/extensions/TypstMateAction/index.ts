import { settingsManager } from '@/libs';

export * from './extension';

import { defineExtension } from '@/libs/extensionManager';
import { buildActionExtensions } from './extension';
import { typstMateActionPackage } from './package';

export const typstMateActionEntry = defineExtension()(() => ({
  package: typstMateActionPackage(),
  factory: (_context, settings) => buildActionExtensions(settingsManager.settings.actions, settings.longPressDelayMs),
}));
