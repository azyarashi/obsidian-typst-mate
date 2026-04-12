import { defineExtension } from '@/libs/extensionManager';
import { zoomExtension } from './extension';
import { zoomPackage } from './package';

export const zoomEntry = defineExtension()(() => ({
  package: zoomPackage(),
  factory: () => zoomExtension,
}));
