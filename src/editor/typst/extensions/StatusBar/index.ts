import { defineExtension } from '@/libs/extensionManager';
import { statusBarExtension } from './extension';
import { statusBarPackage } from './package';

export const statusBarEntry = defineExtension()(() => ({
  package: statusBarPackage(),
  factory: () => statusBarExtension,
}));
