import { Notice, Platform, Setting } from 'obsidian';

import type { PackageSpec } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';

interface PackageSpecWithRPath extends PackageSpec {
  rPath: string;
}

export class PackagesList {
  plugin: ObsidianTypstMate;
  packageTableEl: HTMLElement;

  localPackageTableEl?: HTMLElement;

  constructor(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
    this.plugin = plugin;

    // ローカルパッケージ
    if (Platform.isDesktopApp) {
      new Setting(containerEl)
        .setName('Import Local Package')
        .setDesc('Desktop App only.')
        .addButton((button) => {
          button.setIcon('list-restart');
          button.setTooltip('Import Local Package');

          button.onClick(this.listLocalPackage.bind(this));
        });
      this.localPackageTableEl = containerEl.createDiv('typstmate-settings-table typstmate-hidden');
    }

    // キャッシュ一覧
    const settings = new Setting(containerEl).setName('Cached Packages');
    if (Platform.isDesktopApp) {
      settings.addButton((button) => {
        button.setTooltip('Open Folder');
        button.setIcon('folder');
        button.onClick(async () => {
          window.open(`file://${this.plugin.baseDirPath}/${this.plugin.packagesDirNPath}`);
        });
      });
    }

    this.packageTableEl = containerEl.createDiv('typstmate-settings-table typstmate-hidden');
    this.displayPackageList();
  }

  // システムパッケージ
  async listLocalPackage() {
    this.localPackageTableEl!.empty();

    const packageSpecs: PackageSpecWithRPath[] = [];

    const { fs, path } = this.plugin;
    for (let p of this.plugin.localPackagesDirPaths) {
      if (!path!.isAbsolute(p)) p = `${this.plugin.baseDirPath}/${p}`;

      const namespaces = fs!.readdirSync(p);
      for (const namespace of namespaces) {
        if (!fs!.statSync(`${p}/${namespace}`).isDirectory()) continue;

        if (namespace.endsWith('preview')) continue;

        try {
          const names = fs!.readdirSync(`${p}/${namespace}`);
          for (const name of names) {
            if (!fs!.statSync(`${p}/${namespace}/${name}`).isDirectory()) continue;

            const versions = fs!.readdirSync(`${p}/${namespace}/${name}`);
            for (const version of versions) {
              if (!fs!.statSync(`${p}/${namespace}/${name}/${version}`).isDirectory()) continue;

              const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
              if (!versionPattern.test(version)) continue;

              packageSpecs.push({
                namespace: path!.basename(namespace!, '.'),
                name: path!.basename(name!, '.'),
                version: path!.basename(version!, '.'),
                rPath: p,
              });
            }
          }
        } catch {}
      }
    }
    if (packageSpecs.length === 0) return;
    this.localPackageTableEl!.removeClass('typstmate-hidden');

    for (const spec of packageSpecs) {
      const setting = new Setting(this.localPackageTableEl!);
      setting.settingEl.id = `${spec.rPath}/${spec.namespace}/${spec.name}:${spec.version}`;

      setting.setName(`@${spec.namespace}/${spec.name}:${spec.version}`).addButton((button) => {
        button.setTooltip('Import Font');
        button.setIcon('plus');
        button.onClick(() => {
          this.plugin.typstManager.createCache(spec, true, [spec.rPath]);
        });
      });
    }
  }

  async importLocalPackage() {}

  // キャッシュ一覧
  async displayPackageList() {
    this.packageTableEl.empty();

    const specs = (await this.plugin.app.vault.adapter.list(this.plugin.cachesDirNPath)).files
      .filter((f) => f.endsWith('.cache'))
      .map((f) => {
        const [namespace, name, version] = f.replace('.cache', '').split('/').pop()!.split('_');
        return {
          namespace: namespace!,
          name: name!,
          version: version!,
        };
      });
    if (specs.length === 0) return;

    this.packageTableEl.removeClass('typstmate-hidden');

    for (const spec of specs) {
      const packageEl = new Setting(this.packageTableEl)
        .setName(`@${spec.namespace}/${spec.name}:${spec.version}`)
        .addButton((cacheButton) => {
          cacheButton.setTooltip('Cache');
          cacheButton.setIcon('package');

          cacheButton.onClick(async () => {
            await this.plugin.typstManager
              .createCache(spec, true)
              .then(() => {
                new Notice('Cached successfully!');
              })
              .catch(() => {
                new Notice('Failed to cache');
              });
          });
        })
        .addButton((delButton) => {
          delButton.buttonEl.addClass('typstmate-button', 'typstmate-button-danger');
          delButton.setTooltip('Remove');
          delButton.setIcon('trash');

          delButton.onClick(async () => {
            await this.removePackage(spec)
              .then(() => {
                new Notice('Removed successfully!');
              })
              .catch(() => {
                new Notice('Failed to remove');
              });
          });
        });
      packageEl.settingEl.id = `${spec.namespace}/${spec.name}:${spec.version}`;
    }
  }

  async removePackage(spec: PackageSpec) {
    await this.plugin.app.vault.adapter.remove(
      `${this.plugin.cachesDirNPath}/${spec.namespace}_${spec.name}_${spec.version}.cache`,
    );

    this.packageTableEl.children.namedItem(`${spec.namespace}/${spec.name}:${spec.version}`)?.remove();

    if (this.packageTableEl.children.length === 0) this.packageTableEl.addClass('typstmate-hidden');
  }
}
