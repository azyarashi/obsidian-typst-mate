// TODO

import { render } from 'hono/jsx/dom';
import { setIcon } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { markdownIconEl, settingsIconEl, typstIconEl } from './utils/icons';

import './extension.css';

export class extensionManager {
  private plugin: ObsidianTypstMate;
  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  renderExtensionInfo(extension: ExtensionInfo) {
    const container = createDiv('typstmate-extension-container');

    render(
      <>
        <div class="typstmate-extension-icon-wrapper">
          <div
            class="typstmate-extension-icon"
            ref={(el: HTMLElement) => {
              setIcon(el, extension.icon);
            }}
          />
        </div>

        <div class="typstmate-extension-content">
          <div class="typstmate-extension-name">{extension.name}</div>
          <div class="typstmate-extension-description">{extension.description}</div>
          <div class="typstmate-extension-tags">
            {extension.tags.map((tag) => (
              <span class="typstmate-extension-tag">#{tag}</span>
            ))}
          </div>
        </div>

        <div class="typstmate-extension-right-panel">
          <div class="checkbox-container">
            <input type="checkbox" checked={extension.isBuiltin} disabled={extension.isBuiltin} />
          </div>
          <div class="typstmate-extension-footer">
            {extension.scope.map((s) => (
              <div
                class="typstmate-extension-scope-icon"
                title={s}
                ref={(el: HTMLElement) => {
                  el.empty();
                  el.appendChild((s === 'markdown' ? markdownIconEl : typstIconEl).cloneNode(true));
                }}
              />
            ))}
            {0 < extension.settings.length && (
              <div
                class="typstmate-extension-settings-icon"
                title="Settings"
                ref={(el: HTMLElement) => {
                  el.empty();
                  el.appendChild(settingsIconEl.cloneNode(true));
                }}
              />
            )}
          </div>
        </div>
      </>,
      container,
    );

    return container;
  }

  generateMarkdownExtensions() {}
  generateTypstExtensions() {}
  generateTextAreaExtensions() {}
}

export type Tag =
  | 'core'
  | 'action' // ショートカットとか
  | 'decoration' // ハイライトとか
  | 'ui' // デバッガーとか
  | 'completion'
  | 'navigation'
  | 'theme';

export type EditorContext = 'markdown' | 'typst';

export interface ExtensionInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  tags: Tag[];
  scope: EditorContext[];
  isBuiltin: boolean;
  settings: ExtensionSettingItem[];
}

export type ExtensionSettingItem = ToggleSetting | SliderSetting | TextSetting | DropdownSetting;

interface BaseSetting<T> {
  key: string;
  title: string;
  description: string;
  defaultValue: T;
}

export interface ToggleSetting extends BaseSetting<boolean> {
  type: 'toggle';
}

export interface SliderSetting extends BaseSetting<number> {
  type: 'slider';
  min: number;
  max: number;
  step: number;
}

export interface TextSetting extends BaseSetting<string> {
  type: 'text';
}

export interface DropdownSetting extends BaseSetting<string> {
  type: 'dropdown';
  options: ({ label: string; value: string } | string)[];
}
