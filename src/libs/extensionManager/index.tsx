import { Compartment, type Extension, Facet } from '@codemirror/state';
import { type EditorView, ViewPlugin } from '@codemirror/view';
import type { ComponentChildren } from 'preact';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { settingsManager } from '../settingsManager';
import type { ExtensionEntry, ExtensionSettingItem } from './settings';

export * from './settings';

import './extension.css';

export type Tag = 'core' | 'action' | 'decoration' | 'ui' | 'completion' | 'navigation';
export type EditorContext = 'markdown' | 'typst';
export const ALL_TAGS = ['core', 'action', 'decoration', 'ui', 'completion', 'navigation'] as const;
export const ALL_SCOPES = ['markdown', 'typst'] as const;

export interface ExtensionPackage {
  // UI
  readonly name: string;
  readonly icon: ComponentChildren;
  readonly description: string | DocumentFragment;
  readonly tags: readonly Tag[];

  // 設定
  readonly scope: readonly EditorContext[];
  readonly settings: readonly ExtensionSettingItem[];

  // メタ
  readonly id: string;
  readonly isBuiltin: boolean;
  readonly isHidden?: boolean;
  readonly defaultEnabled?: boolean;
  readonly displayOrder?: number;
}

export type ExtensionPackageFn = () => ExtensionPackage;

interface ManagedEntry {
  entry: ExtensionEntry<any>;
  compartments: Partial<Record<EditorContext, Compartment>>;
}

export class ExtensionManager implements Singleton {
  private entries: ManagedEntry[] = [];
  private settingsEditorFactory: (() => Extension[]) | null = null;
  private views: Partial<Record<EditorContext, EditorView[]>> = {
    markdown: [],
    typst: [],
  };

  init(_: ObsidianTypstMate) {}

  registerSettingsEditorFactory(factory: () => Extension[]) {
    this.settingsEditorFactory = factory;
  }

  buildSettingsEditorExtensions(): Extension[] {
    return this.settingsEditorFactory?.() ?? [];
  }

  register(definition: () => ExtensionEntry<any>) {
    const entry = definition();
    const existing = this.entries.find((e) => e.entry.package.id === entry.package.id);
    if (existing) return;

    const compartments: Partial<Record<EditorContext, Compartment>> = {};
    for (const ctx of entry.package.scope) compartments[ctx] = new Compartment();

    this.entries.push({ entry, compartments });
  }

  /* build extensions */

  buildExtensions(context: EditorContext): Extension[] {
    const result: Extension[] = [EditorContextFacet.of(context)];
    for (const managed of this.entries) {
      const { entry, compartments } = managed;
      const compartment = compartments[context];
      if (!compartment) continue;

      const inner = this.resolveExtension(entry, context);
      result.push(compartment.of(inner));
    }
    return result;
  }

  private resolveExtension(entry: ExtensionEntry<any>, context: EditorContext): Extension {
    const setting = settingsManager.settings.extensionSettings[context][entry.package.id];
    const enabled = entry.package.isBuiltin || (setting ? setting.enabled : (entry.package.defaultEnabled ?? true));
    if (!enabled) return [];

    const defaultValues = this.buildDefaultValues(entry.package.settings);
    const values = {
      ...defaultValues,
      ...(setting?.values ?? {}),
    };

    const entryExt = entry.factory(context, values);
    return entryExt ?? [];
  }

  private buildDefaultValues(items: readonly ExtensionSettingItem[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const item of items) if ('key' in item) result[item.key] = item.defaultValue;
    return result;
  }

  /* reconfigure */

  reconfigure(id: string) {
    const managed = this.entries.find((e) => e.entry.package.id === id);
    if (!managed) return;

    for (const [ctx, compartment] of Object.entries(managed.compartments) as [EditorContext, Compartment][]) {
      const views = this.views[ctx] ?? [];
      const inner = this.resolveExtension(managed.entry, ctx);
      for (const view of views) view.dispatch({ effects: compartment.reconfigure(inner) });
    }
  }

  reconfigureAll() {
    for (const managed of this.entries) this.reconfigure(managed.entry.package.id);
  }

  /* entry */

  getEntry(id: string) {
    return this.entries.find((m) => m.entry.package.id === id)?.entry ?? null;
  }

  getEntries() {
    return this.entries.map((m) => m.entry);
  }

  /* view */

  addView(context: EditorContext, view: EditorView) {
    if (!this.views[context]) this.views[context] = [];
    if (!this.views[context]?.includes(view)) this.views[context]?.push(view);
  }

  removeView(context: EditorContext, view: EditorView) {
    const list = this.views[context];
    if (!list) return;
    const idx = list.indexOf(view);
    if (idx !== -1) list.splice(idx, 1);
  }

  /* detach */

  detach() {
    this.entries = [];
    this.views = { markdown: [], typst: [] };
  }
}

export const extensionManager = new ExtensionManager();

/* extensions */

export const EditorContextFacet = Facet.define<EditorContext, EditorContext>({
  combine: (values) => values[0]!,
});

export const viewTracker = (context: EditorContext) =>
  ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {
        extensionManager.addView(context, view);
      }
      destroy() {
        extensionManager.removeView(context, this.view);
      }
    },
  );
