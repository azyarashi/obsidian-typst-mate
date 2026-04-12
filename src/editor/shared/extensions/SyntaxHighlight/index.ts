import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { obsidianTheme, typstTheme } from '../Theme';
import { typstSyntaxHighlighting } from './extension';
import { syntaxHighlightPackage } from './package';

export const syntaxHighlightEntry = defineExtension()(() => ({
  package: syntaxHighlightPackage(),
  factory: (_context, settings) => [typstSyntaxHighlighting(), settings.useObsidianTheme ? obsidianTheme : typstTheme],
}));
