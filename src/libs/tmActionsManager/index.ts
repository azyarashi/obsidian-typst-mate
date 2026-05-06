import { appUtils } from '@/libs/appUtils';
import { settingsManager } from '@/libs/settingsManager';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { consoleError } from '@/utils/notice';
import type { TMAction } from './definition';
import { importRaw, normalizeTMActionRaw } from './utils';

export type {
  Action as TMActionAction,
  ActionType,
  TMAction,
  TMActionContext,
  TMActionExtraAction,
  TMActionRaw,
  TMActionRestriction,
  Trigger,
  TriggerType,
} from './definition';
export { ActionTypes, TMActionContexts, TMActionExtraActions, TMActionRestrictions, TriggerTypes } from './definition';
export { importRaw, normalizeTMActionRaw, validateTMAction } from './utils';

class TMActionsManager implements Singleton {
  private tmactions: TMAction[] = [];

  get actions(): TMAction[] {
    return this.tmactions;
  }

  async init(_plugin: ObsidianTypstMate) {
    await this.load();
  }

  async load() {
    const settings = settingsManager.settings;
    let source: string;

    if (settings.useTmactionsFile) {
      // TODO
      const path = `${settings.resourcesPath}/tmactions`;
      if (!path) {
        this.tmactions = [];
        return;
      }

      try {
        source = await appUtils.app.vault.adapter.read(path);
      } catch (e) {
        consoleError('Failed to read TMActions file', e);
        this.tmactions = [];
        return;
      }
    } else source = settings.tmactionsSource;

    if (!source?.trim()) {
      this.tmactions = [];
      return;
    }

    try {
      const raw = await importRaw(source);
      if (!Array.isArray(raw)) {
        consoleError('TMActions must export an array');
        this.tmactions = [];
        return;
      }
      this.tmactions = raw.map((item: unknown) => normalizeTMActionRaw(item as any));
    } catch (e) {
      consoleError('Failed to load TMActions', e);
      this.tmactions = [];
    }
  }

  detach() {
    this.tmactions = [];
  }
}

export const tmActionsManager = new TMActionsManager();
