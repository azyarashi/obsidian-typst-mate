import { t } from '@/i18n';
import { appUtils } from '@/libs';
import type { CommandGen } from '.';

export const openTypstToolsCommand: CommandGen = () => {
  return {
    id: 'open-typst-tools',
    name: t('common.openTypstTools'),
    callback: async () => {
      await appUtils.openTypstTools(true);
    },
  };
};
