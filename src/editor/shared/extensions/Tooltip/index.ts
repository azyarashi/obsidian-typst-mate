import { defineExtension } from '@/managers/extensionManager';
import { hoverExtension } from './extension';
import { tooltipPackage } from './package';

export * from './extension';

export const tooltipEntry = defineExtension()(() => ({
  package: tooltipPackage(),
  factory: () => hoverExtension,
}));
