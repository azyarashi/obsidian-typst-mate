import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const inlinePreviewPackage: ExtensionPackageFn = () => ({
  id: 'inline-preview',
  name: t('settings.extensions.inlinePreviewName'),
  icon: ICONS.ScanEye,
  description: t('settings.extensions.inlinePreviewDesc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [
    {
      type: 'toggle',
      key: 'disableOnMathJax',
      title: t('settings.extensions.inlinePreviewDisableOnMathJaxName'),
      description: t('settings.extensions.inlinePreviewDisableOnMathJaxDesc'),
      defaultValue: false,
    },
  ],
});
