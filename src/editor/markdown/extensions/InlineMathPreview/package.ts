import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const inlineMathPreviewPackage: ExtensionPackageFn = () => ({
  id: 'inline-math-preview',
  name: t('settings.extensions.inlineMathPreview.name'),
  icon: ICONS.ScanEye,
  description: tFragment('settings.extensions.inlineMathPreview.desc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [
    {
      type: 'toggle',
      key: 'disableOnMathJax',
      title: t('settings.extensions.inlineMathPreview.disableOnMathJaxName'),
      description: tFragment('settings.extensions.inlineMathPreview.disableOnMathJaxDesc'),
      defaultValue: false,
    },
  ],
});
