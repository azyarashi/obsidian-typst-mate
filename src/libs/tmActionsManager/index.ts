import { appUtils } from '@/libs/appUtils';
import { settingsManager } from '@/libs/settingsManager';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import type { TMAction } from './definition';
import { importRaw, normalizeTMActionRaw } from './utils';

export type {
  Action as TMActionAction,
  ActionType,
  TMAction,
  TMActionContext,
  TMActionExtraAction,
  TMActionRaw,
  TMActionRequirement,
  Trigger,
  TriggerType,
} from './definition';
export { ActionTypes, TMActionContexts, TMActionExtraActions, TMActionRequirements, TriggerTypes } from './definition';
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
      const path = settings.tmactionsFileNPath;
      if (!path) {
        this.tmactions = [];
        return;
      }

      try {
        source = await appUtils.app.vault.adapter.read(path);
      } catch (e) {
        console.error('[Typst Mate] Failed to read TMActions file:', e);
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
        console.error('[Typst Mate] TMActions must export an array');
        this.tmactions = [];
        return;
      }
      this.tmactions = raw.map((item: unknown) => normalizeTMActionRaw(item as any));
    } catch (e) {
      console.error('[Typst Mate] Failed to load TMActions:', e);
      this.tmactions = [];
    }
  }

  detach() {
    this.tmactions = [];
  }
}

export const tmActionsManager = new TMActionsManager();
