import type { EditorView } from '@codemirror/view';
import { type Editor, MarkdownView } from 'obsidian';
import type ObsidianTypstMate from '@/main';

const vimModeCache = new WeakMap<EditorView, string>();

export function getObsidianVimMode(view: EditorView): string | undefined {
  return vimModeCache.get(view);
}

export function registerVimModeTracker(plugin: ObsidianTypstMate) {
  const trackEditor = (editor: Editor) => {
    const e = editor as any;
    if (e.__typstMateVimTracked) return;
    e.__typstMateVimTracked = true;

    e.on?.('vim-mode-change', (data: { mode: string }) => {
      const view = e.cm as EditorView;
      if (view) vimModeCache.set(view, data.mode);
    });

    if (e.cm) vimModeCache.set(e.cm, 'normal');
  };

  plugin.registerEvent(
    plugin.app.workspace.on('active-leaf-change', (leaf) => {
      if (leaf?.view instanceof MarkdownView) trackEditor(leaf.view.editor);
    }),
  );

  plugin.app.workspace.onLayoutReady(() => {
    plugin.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
      if (leaf.view instanceof MarkdownView) trackEditor(leaf.view.editor);
    });
  });
}
