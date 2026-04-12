import { TypstMate } from '@/api';
import { DEFAULT_SETTINGS, type Settings } from '@/data/settings';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { migrations } from './migration';

class SettingsManager implements Singleton {
  private plugin?: ObsidianTypstMate;

  settings!: Settings;
  version!: string;

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    await this.loadSettings();

    this.migrate();
    this.normalizeSettings();
  }

  async loadSettings() {
    if (!this.plugin) return;

    const storedSettings = await this.plugin.loadData();
    if (storedSettings?.extensionSettings) {
      if (Array.isArray(storedSettings.extensionSettings.markdown)) {
        storedSettings.extensionSettings.markdown = Object.fromEntries(
          storedSettings.extensionSettings.markdown.map((s: any) => [s.id, s]),
        );
      }
      if (Array.isArray(storedSettings.extensionSettings.typst)) {
        storedSettings.extensionSettings.typst = Object.fromEntries(
          storedSettings.extensionSettings.typst.map((s: any) => [s.id, s]),
        );
      }
    }

    this.version = storedSettings?.version ?? DEFAULT_SETTINGS.version;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
  }

  private migrate() {
    while (this.version !== TypstMate.version) {
      const migration = migrations.find((m) => m.version === this.version);
      if (!migration) return; // TODO;

      this.settings = migration.migrate(this.settings);
      this.version = migration.next;
    }

    this.settings.version = this.version;
  }

  private normalizeSettings() {
    for (const key of Object.keys(this.settings) as (keyof Settings)[]) {
      if (key in DEFAULT_SETTINGS) continue;

      delete this.settings[key];
    }
  }

  async saveSettings() {
    if (!this.plugin) return;

    await this.plugin.saveData(this.settings);
  }

  async detach() {
    await this.saveSettings();
    (this as any).plugin = undefined;
    (this as any).settings = undefined;
    (this as any).version = undefined;
  }
}

export const settingsManager = new SettingsManager();
