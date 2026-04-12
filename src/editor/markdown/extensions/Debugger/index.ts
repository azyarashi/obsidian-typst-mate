import { defineExtension } from '@/libs/extensionManager';
import { debuggerExtension } from './extension';
import { debuggerPackage } from './package';

export const debuggerEntry = defineExtension()(() => ({
  package: debuggerPackage(),
  factory: () => debuggerExtension,
}));
