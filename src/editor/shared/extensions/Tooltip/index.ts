import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { hoverExtension } from './extension';
import { tooltipPackage } from './package';

export const tooltipEntry = defineExtension()(() => ({
  package: tooltipPackage(),
  factory: () => hoverExtension,
}));
