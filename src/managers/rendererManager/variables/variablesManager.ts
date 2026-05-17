import type ObsidianTypstMate from '@/main';
import { settingsManager } from '@/managers/settingsManager';
import { $ } from '@/managers/wasmManager';
import type { Singleton } from '@/types/singleton';

export class VariablesManager implements Singleton {
  private lastWidth = '';
  private onRerender?: () => void;

  init(_: ObsidianTypstMate) {}

  setOnRerender(onRerender: () => void) {
    this.onRerender = onRerender;
  }

  async syncNoteWidth() {
    const { settings } = settingsManager;
    const profileName = settings.fitToNoteWidthProfile;
    if (profileName === 'Live') return;

    const profile = settings.fitToNoteWidthProfiles.find((p) => p.name === profileName);
    if (!profile) return;

    if (this.lastWidth === profile.width) return;
    this.lastWidth = profile.width;

    if ($.wasm) {
      await $.wasm.setViewportWidth(profile.width);
      await $.wasm.updateVariables();
      this.onRerender?.();
    }
  }

  async update() {
    if ($.wasm) {
      await $.wasm.updateVariables();
      this.onRerender?.();
    }
  }

  async detach() {
    this.onRerender = undefined;
  }
}

export const variablesManager = new VariablesManager();
