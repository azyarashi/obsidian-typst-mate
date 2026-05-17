import { defineExtension } from '@/managers/extensionManager';
import { debuggerExtension } from './extension';
import { debuggerPackage } from './package';

export const debuggerEntry = defineExtension()(() => ({
  package: debuggerPackage(),
  factory: () => debuggerExtension,
}));
