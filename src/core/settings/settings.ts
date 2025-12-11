import { type App, debounce, Notice, Platform, PluginSettingTab, Setting } from 'obsidian';

import type { CodeblockProcessor, DisplayProcessor, ExcalidrawProcessor, InlineProcessor } from '@/libs/processor';
import type { Snippet } from '@/libs/snippet';
import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

import { FontList } from './components/font';
import { PackagesList } from './components/package';
import { ProcessorList } from './components/processor';

import './settings.css';

export interface Settings {
  enableBackgroundRendering: boolean;
  autoBaseColor: boolean;
  baseColor: string;
  enableMathjaxFallback: boolean;
  skipPreparationWaiting: boolean;
  enableInlinePreview: boolean;
  disablePackageCache: boolean;
  enableShortcutKeys: boolean;
  openTypstToolsOnStartup: boolean;
  preamble: string;
  processor: {
    inline?: {
      processors: InlineProcessor[];
    };
    display?: {
      processors: DisplayProcessor[];
    };
    codeblock?: {
      processors: CodeblockProcessor[];
    };
    excalidraw?: {
      processors: ExcalidrawProcessor[];
    };
  };
  snippets?: Snippet[];
  complementSymbolWithUnicode?: boolean;
  revertTabToDefault?: boolean;
  patchPDFExport?: boolean;
  disableMacro?: boolean;
  crashCount?: number;
}
export const DEFAULT_SETTINGS: Settings = {
  enableBackgroundRendering: true,
  autoBaseColor: true,
  baseColor: '#000000',
  enableMathjaxFallback: false,
  skipPreparationWaiting: false,
  enableInlinePreview: true,
  disablePackageCache: false,
  enableShortcutKeys: true,
  openTypstToolsOnStartup: true,
  preamble: [
    '#set page(margin: 0pt, width: auto, height: auto)',
    '#show raw: set text(size: 1.25em)',
    '#set text(size: fontsize)',
  ].join('\n'),
  processor: {
    inline: {
      processors: [
        {
          id: 'ce',
          renderingEngine: 'typst-svg',
          format: [
            '#import "@preview/typsium:0.3.0": ce',
            '#show math.equation: set text(font: ("New Computer Modern Math", "Noto Serif CJK SC"))',
            '#ce("{CODE}")',
          ].join('\n'),
          styling: 'inline-middle',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'mid',
          renderingEngine: 'typst-svg',
          format: '$ {CODE} $',
          styling: 'inline-middle',
          noPreamble: true,
          fitToParentWidth: false,
        },
        {
          id: 'tex',
          renderingEngine: 'mathjax',
          format: '',
          styling: 'inline',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '${CODE}$',
          styling: 'inline',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    display: {
      processors: [
        {
          id: 'block',
          renderingEngine: 'typst-svg',
          format: '$ {CODE} $',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '$ {CODE} $',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    codeblock: {
      processors: [
        {
          id: 'typ',
          renderingEngine: 'typst-svg',
          format: '{CODE}',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'typst',
          renderingEngine: 'typst-svg',
          format: '```typst\n{CODE}\n```',
          styling: 'codeblock',
          noPreamble: true,
          fitToParentWidth: true,
        },
      ],
    },
    excalidraw: {
      processors: [
        {
          id: 'default',
          renderingEngine: 'typst-svg',
          format: '#set page(margin: 0.25em)\n{CODE}$',
          styling: 'default',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
  },
  snippets: [
    {
      category: 'Matrix',
      name: 'mat',
      description: 'e.g. mat(3,3)@',
      kind: 'display',
      id: '',
      content:
        'const parts = input.split(",").map(s => s.trim());\n\nconst [x, y] = parts.map(Number)\n\nconst rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;\\n`;\nconst contentText = `  ${rowText}`.repeat(y);\n\nreturn `mat(\\n${contentText})`;',
      script: true,
    },
    {
      category: 'Matrix',
      name: 'matInline',
      description: 'e.g. mat(3,3)@',
      kind: 'inline',
      id: '',
      content:
        'const parts = input.split(",").map(s => s.trim());\n\nconst [x, y] = parts.map(Number)\n\nconst rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;`;\nconst contentText = `${rowText}`.repeat(y);\n\nreturn `mat(${contentText})`;',
      script: true,
    },
    {
      category: 'Cases',
      name: 'cases',
      description: '',
      kind: 'display',
      id: '',
      content: 'cases(#CURSOR "if" #CURSOR, #CURSOR "else")',
      script: false,
    },
    {
      category: 'Cases',
      name: 'casesn',
      description: 'e.g. casesn(3)@',
      kind: 'display',
      id: '',
      content:
        'const n = Number(input);\nreturn `cases(\\n${(`  #CURSOR "if" #CURSOR,\\n`).repeat(n-1)}  #CURSOR "else"\\n)`',
      script: true,
    },
  ],
  complementSymbolWithUnicode: true,
  revertTabToDefault: false,
  patchPDFExport: false,
  disableMacro: false,
  crashCount: 0,
};

export class SettingTab extends PluginSettingTab {
  override plugin: ObsidianTypstMate;

  constructor(app: App, plugin: ObsidianTypstMate) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    this.addGeneralSettings(containerEl);
    this.addProcessorSettings(containerEl);
    this.addPreview(containerEl);
    this.addFontSettings(containerEl);
    this.addTypstPackageSettings(containerEl);
    this.addAdvancedSettings(containerEl);
  }

  addGeneralSettings(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('General')
      .setHeading()
      .addButton((button) => {
        button.setButtonText('Reload Plugin');
        button.onClick(async () => {
          await this.plugin.reload(true);
          new Notice('Plugin reloaded.');
        });
      });

    new Setting(containerEl)
      .setName('Enable Background Rendering')
      .setDesc(
        new CustomFragment()
          .appendText('The UI will no longer freeze, but ')
          .appendText('it may conflict with plugins related to export or rendering')
          .appendText(
            '. When exporting to PDF from the Markdown menu, this setting will be automatically disabled temporarily.',
          ),
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableBackgroundRendering);
        toggle.onChange((value) => {
          this.plugin.settings.enableBackgroundRendering = value;
          this.plugin.saveSettings();
          this.plugin.reload(true);
        });
      });

    new Setting(containerEl)
      .setName('Use Theme Text Color')
      .setDesc("Uses Obsidian's text color as the base color automatically.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoBaseColor);
        toggle.onChange((value) => {
          this.plugin.settings.autoBaseColor = value;
          this.plugin.applyBaseColor();

          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Open Typst Tools on Startup')
      .setDesc('Open Typst tools in side panel when launching Obsidian.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.openTypstToolsOnStartup);
        toggle.onChange((value) => {
          this.plugin.settings.openTypstToolsOnStartup = value;
          this.plugin.saveSettings();
        });
      });
  }

  addProcessorSettings(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Processor')
      .setDesc(
        new CustomFragment()
          .appendText(
            'In each mode, the first matching Processor ID from the top will be used. An empty Processor ID means the default and should be placed at the bottom. In the format, ',
          )
          .appendCodeText('{CODE}')
          .appendText(' can be used (only the first occurrence is replaced), and ')
          .appendCodeText('fontsize')
          .appendText(
            ' can be used as an internal length value. In inline mode, separate the id and the code with a colon ',
          )
          .appendCodeText(':')
          .appendText(
            ' in the format. When adding or removing processors for codeblock mode, reload the plugin to apply changes. ',
          )
          .appendBoldText('IDs should not contain any special characters!')
          .appendText(' For more details, see ')
          .appendLinkText('Processor.md', 'https://github.com/azyarashi/obsidian-typst-mate/blob/main/Processor.md')
          .appendText('.'),
      )
      .setHeading();

    new Setting(containerEl)
      .setName('Preamble')
      .setDesc('Preamble can be turned on or off by toggling each processor.');
    const preambleTextEl = containerEl.createEl('textarea');
    preambleTextEl.addClass('typstmate-form-control');
    preambleTextEl.addClass('typstmate-preamble');
    preambleTextEl.value = this.plugin.settings.preamble;
    preambleTextEl.placeholder = 'preamble';

    preambleTextEl.addEventListener(
      'input',
      debounce(
        () => {
          this.plugin.settings.preamble = preambleTextEl.value;

          this.plugin.saveSettings();
        },
        500,
        true,
      ),
    );

    new ProcessorList(this.plugin, 'inline', containerEl, 'Inline($...$) Processors');
    new ProcessorList(this.plugin, 'display', containerEl, 'Display($$...$$) Processors');
    new ProcessorList(this.plugin, 'codeblock', containerEl, 'CodeBlock(```...```) Processors');
    if (this.plugin.excalidrawPluginInstalled) {
      new ProcessorList(this.plugin, 'excalidraw', containerEl, 'Excalidraw Processors');
    }
  }

  addPreview(containerEl: HTMLElement) {
    const previewContainer = containerEl.createDiv('typstmate-settings-preview');

    new Setting(previewContainer)
      .setName('Preview')
      .setHeading()
      .addDropdown((dropdown) => {
        dropdown.addOption('inline', 'Inline');
        dropdown.addOption('display', 'Display');
        dropdown.addOption('codeblock', 'CodeBlock');
        dropdown.setValue('inline');

        dropdown.onChange((value) => {
          inputEl.empty();
          previewEl.empty();

          switch (value) {
            case 'inline': {
              inputEl.createEl('span', { text: '$' });
              const idEl = inputEl.createEl('input', {
                type: 'text',
                placeholder: 'id',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('span', { text: ':' });
              const codeEl = inputEl.createEl('input', {
                type: 'text',
                placeholder: 'code',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('span', { text: '$' });

              const updatePreview = () => {
                const id = idEl.value;
                const code = codeEl.value;
                previewEl.empty();
                if (code) {
                  this.plugin.typstManager.render(`${id ? `${id}:` : ''}${code}`, previewEl, 'inline');
                }
              };

              idEl.addEventListener('input', updatePreview);
              codeEl.addEventListener('input', updatePreview);
              break;
            }
            case 'display': {
              inputEl.createEl('span', { text: '$$' });
              const idEl = inputEl.createEl('input', {
                type: 'text',
                placeholder: 'id',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('br');
              const codeEl = inputEl.createEl('textarea', {
                placeholder: 'code',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('br');
              inputEl.createEl('span', { text: '$$' });

              const updatePreview = () => {
                const id = idEl.value;
                const code = codeEl.value;
                previewEl.empty();
                if (code) {
                  this.plugin.typstManager.render(`${id ? `${id}\n` : ''}${code}\n`, previewEl, 'display');
                }
              };

              idEl.addEventListener('input', updatePreview);
              codeEl.addEventListener('input', updatePreview);
              break;
            }
            case 'codeblock': {
              inputEl.createEl('span', { text: '```' });
              const idEl = inputEl.createEl('input', {
                type: 'text',
                placeholder: 'id',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('br');
              const codeEl = inputEl.createEl('textarea', {
                placeholder: 'code',
                cls: 'typstmate-form-control',
              });
              inputEl.createEl('br');
              inputEl.createEl('span', { text: '```' });

              const updatePreview = () => {
                const id = idEl.value;
                const code = codeEl.value;
                previewEl.empty();
                if (code) {
                  this.plugin.typstManager.render(code, previewEl, id || '');
                }
              };

              idEl.addEventListener('input', updatePreview);
              codeEl.addEventListener('input', updatePreview);
              break;
            }
          }
        });
      });

    const inputEl = previewContainer.createDiv('typstmate-settings-preview-input');
    inputEl.createEl('span', { text: '$' });
    const idEl = inputEl.createEl('input', {
      type: 'text',
      placeholder: 'id',
      cls: 'typstmate-form-control',
    });
    inputEl.createEl('span', { text: ':' });
    const codeEl = inputEl.createEl('input', {
      type: 'text',
      placeholder: 'code',
      cls: 'typstmate-form-control',
    });
    inputEl.createEl('span', { text: '$' });

    const updatePreview = () => {
      const id = idEl.value;
      const code = codeEl.value;
      previewEl.empty();
      if (code) {
        this.plugin.typstManager.render(`${id ? `${id}:` : ''}${code}`, previewEl, 'inline');
      }
    };

    idEl.addEventListener('input', updatePreview);
    codeEl.addEventListener('input', updatePreview);

    const previewEl = previewContainer.createDiv('typstmate-settings-preview-preview');
    previewEl.setText('Type in the input above to see the preview');
  }

  addFontSettings(containerEl: HTMLElement) {
    const setting = new Setting(containerEl).setName('Font').setHeading();

    if (Platform.isDesktopApp) {
      setting.addButton((button) => {
        button.setIcon('folder-open');

        button.setTooltip('Open Fonts Directory');
        button.onClick(() => {
          window.open(`file://${this.plugin.app.vault.adapter.basePath}/${this.plugin.fontsDirNPath}`);
        });
      });
    }

    // フォント一覧
    new FontList(this.plugin, containerEl);
  }

  addTypstPackageSettings(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Package')
      .setDesc(
        'When a package is imported, the cache is used instead of the actual files for faster performance. If you make changes directly, please click the package icon to refresh the cache(plugin reload is required.)',
      )
      .setHeading();

    // パッケージ一覧
    new PackagesList(this.plugin, containerEl);
  }

  addAdvancedSettings(containerEl: HTMLElement) {
    new Setting(containerEl).setName('Advanced').setHeading();

    new Setting(containerEl)
      .setName('Base Color')
      .setDesc(
        new CustomFragment()
          .appendText(
            'Replace black in SVGs with another color. This is useful when using a dark theme. To enable this, you need to disable the ',
          )
          .appendCodeText('Use Theme Text Color')
          .appendText(' setting.'),
      )
      .addColorPicker((colorPicker) => {
        colorPicker.setValue(this.plugin.settings.baseColor);
        colorPicker.onChange((value) => {
          this.plugin.settings.baseColor = value;
          this.plugin.applyBaseColor();
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Enable MathJax Fallback')
      .setDesc(
        new CustomFragment()
          .appendText('Not recommended for performance reasons. When enabled, ')
          .appendBoldText('Typst errors, warnings, and hints will be unavailable.')
          .appendText(''),
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableMathjaxFallback);
        toggle.onChange((value) => {
          this.plugin.settings.enableMathjaxFallback = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Skip Preparation Waiting')
      .setDesc(
        "This feature is unstable on mobile! Defers initialization of font and package loading and processor compilation at plugin startup, which greatly reduces Obsidian's startup time. However, the time until the first rendering does not change; the original text will be shown until then.",
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.skipPreparationWaiting);
        toggle.onChange((value) => {
          this.plugin.settings.skipPreparationWaiting = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName('Enable Inline Preview').addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableInlinePreview);
      toggle.onChange((value) => {
        this.plugin.settings.enableInlinePreview = value;
        this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName('Disable Package Cache')
      .setDesc(
        'Enable this if crashes occur on mobile apps with low RAM. However, packages will need to be installed every time. On desktop apps, startup time will be reduced. If you use a lot of packages, you may want to enable this.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.disablePackageCache);
        toggle.onChange((value) => {
          this.plugin.settings.disablePackageCache = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName('Complement Symbol with Unicode').addToggle((toggle) => {
      toggle.setValue(
        this.plugin.settings.complementSymbolWithUnicode ?? DEFAULT_SETTINGS.complementSymbolWithUnicode!,
      );
      toggle.onChange((value) => {
        this.plugin.settings.complementSymbolWithUnicode = value;
        this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName('Enable Shortcut Keys').addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableShortcutKeys ?? DEFAULT_SETTINGS.enableShortcutKeys!);
      toggle.onChange((value) => {
        this.plugin.settings.enableShortcutKeys = value;
        this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName('Patch PDF Export')
      .setDesc(
        'When performing PDF Export, temporarily disable AutoBaseColor and use BaseColor. This option exists because when performing PDF Export with a dark theme, it often outputs with a white background.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.patchPDFExport ?? DEFAULT_SETTINGS.patchPDFExport!);
        toggle.onChange((value) => {
          this.plugin.settings.patchPDFExport = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Revert Tab to Default')
      .setDesc('Reverts the Tab key behavior to the default indentation instead of jumping to the next placeholder.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.revertTabToDefault ?? DEFAULT_SETTINGS.revertTabToDefault!);
        toggle.onChange((value) => {
          this.plugin.settings.revertTabToDefault = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Disable Macro')
      .setDesc('Currently, there are only mk and dm, but you can create your own macros in the future.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.disableMacro ?? DEFAULT_SETTINGS.disableMacro!);
        toggle.onChange((value) => {
          this.plugin.settings.disableMacro = value;
          this.plugin.saveSettings();
        });
      });

    const div = containerEl.createDiv();
    div.textContent = 'Are you looking for the snippet settings? It is in ';
    const a = div.createEl('a', { text: 'Leaf' });
    a.addEventListener('click', async () => {
      await this.plugin.activateLeaf(true, 'snippets');
      this.app.setting.close();
    });
  }
}
