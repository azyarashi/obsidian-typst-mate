import type { Extension } from '@codemirror/state';

import type { EditorContext } from '..';
import type { ExtensionPackage } from '.';

export type ExtensionSettingItem =
  | ToggleSetting
  | SliderSetting
  | TextSetting
  | DropdownSetting
  | KeymapSetting
  | HeaderSetting;

export interface HeaderSetting {
  type: 'header';
  title: string | DocumentFragment;
}

interface BaseSetting<T> {
  key: string;
  title: string | DocumentFragment;
  description: string | DocumentFragment;
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

export interface KeymapSetting extends BaseSetting<string> {
  type: 'keymap';
}

/**
 * ExtensionSettingItem の定義から設定値の型を推論します。
 */
export type InferSettingsFromItems<T extends readonly ExtensionSettingItem[]> = {
  [K in Extract<T[number], { key: string }>['key']]: Extract<T[number], { key: K }> extends BaseSetting<infer V>
    ? V
    : never;
};

/**
 * ExtensionEntry から設定値の型を推論します。
 */
export type InferSettings<E> = E extends ExtensionEntry<infer S> ? S : never;

/**
 * ExtensionPackage を返す関数から設定値の型を推論します。
 */
export type InferSettingsFromPackage<P extends (...args: any[]) => { settings: readonly ExtensionSettingItem[] }> =
  InferSettingsFromItems<ReturnType<P>['settings']>;

/**
 * ExtensionManager に登録するエントリー。
 * factory は EditorContext に応じた Extension (or null) を返す。
 */
export interface ExtensionEntry<Settings = Record<string, any>> {
  package: ExtensionPackage;
  factory: (context: EditorContext, settings: Settings) => Extension | null;
}

/**
 * ExtensionEntry を定義するためのヘルパー関数。
 * 他のモジュールのロードタイミング（t() が未初期化の時）に実行されないよう、関数として定義する。
 */
export function defineExtension<Settings extends Record<string, any> = never>() {
  return <const T extends readonly ExtensionSettingItem[]>(
    definition: () => {
      package: Omit<ExtensionPackage, 'settings'> & {
        settings: T;
      };
      factory: (
        context: EditorContext,
        settings: [Settings] extends [never] ? InferSettingsFromItems<T> : Settings,
      ) => Extension | null;
    },
  ): (() => ExtensionEntry<[Settings] extends [never] ? InferSettingsFromItems<T> : Settings>) => {
    return definition as any;
  };
}

export interface ExtensionSetting {
  id: string;
  enabled: boolean;
  values: Record<string, unknown>;
}
