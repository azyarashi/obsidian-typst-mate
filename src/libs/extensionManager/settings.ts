import type { Extension } from '@codemirror/state';

import type { EditorContext } from '..';
import type { ExtensionInfo } from '.';

export type ExtensionSettingItem = ToggleSetting | SliderSetting | TextSetting | DropdownSetting | KeymapSetting;

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

export interface KeymapSetting extends BaseSetting<string> {
  type: 'keymap';
}

/**
 * ExtensionSettingItem の定義から設定値の型を推論します。
 */
export type InferSettingsFromItems<T extends readonly ExtensionSettingItem[]> = {
  [K in T[number]['key']]: Extract<T[number], { key: K }> extends BaseSetting<infer V> ? V : never;
};

/**
 * ExtensionEntry から設定値の型を推論します。
 */
export type InferSettings<E> = E extends ExtensionEntry<infer S> ? S : never;

/**
 * ExtensionManager に登録するエントリー。
 * factory は EditorContext に応じた Extension (or null) を返す。
 */
export interface ExtensionEntry<Settings = Record<never, never>> {
  info: ExtensionInfo;
  factory: (context: EditorContext, settings: Settings) => Extension | null;
}

/**
 * ExtensionEntry を定義するためのヘルパー関数。
 */
export function defineExtension<Settings extends Record<string, any> = any>() {
  return <const T extends readonly ExtensionSettingItem[]>(entry: {
    info: Omit<ExtensionInfo, 'settings'> & {
      settings: T;
    };
    factory: (
      context: EditorContext,
      settings: [Settings] extends [any] ? InferSettingsFromItems<T> : Settings,
    ) => Extension | null;
  }): ExtensionEntry<[Settings] extends [any] ? InferSettingsFromItems<T> : Settings> => {
    return entry as any;
  };
}

export interface ExtensionSetting {
  id: string;
  enabled: boolean;
  values: Record<string, unknown>;
}
