import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { editorHelperFacet } from '../core/Helper';

const MACRO_DELAY = 500;

interface MacroDefinition {
  trigger: [string, string];
  insert: string;
  cursorOffset: (from: number) => number;
}

const MACROS: MacroDefinition[] = [
  {
    trigger: ['d', 'm'],
    insert: '$$\n\n$$',
    cursorOffset: (from) => from + 3,
  },
  {
    trigger: ['m', 'k'],
    insert: '${}  {}$',
    cursorOffset: (from) => from + 4,
  },
];

class MathMacroPluginValue {
  beforeKey: string | null = null;
  lastKeyDownTime = 0;

  constructor(public view: EditorView) {}

  update(_update: ViewUpdate) {}

  destroy() {
    this.beforeKey = null;
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    const helper = this.view.state.facet(editorHelperFacet);
    if (helper.plugin.settings.disableMacro) return false;

    const { key, ctrlKey, metaKey, altKey } = e;
    if (ctrlKey || metaKey || altKey) return false;

    for (const macro of MACROS) {
      if (this.beforeKey === macro.trigger[0] && key === macro.trigger[1]) {
        if (Date.now() - this.lastKeyDownTime > MACRO_DELAY) {
          this.beforeKey = key;
          this.lastKeyDownTime = Date.now();
          return false;
        }

        e.preventDefault();

        const cursor = this.view.state.selection.main.head;
        const from = cursor - 1;
        const to = cursor;

        this.view.dispatch({
          changes: { from, to, insert: macro.insert },
          selection: { anchor: macro.cursorOffset(from) },
        });

        this.beforeKey = null;
        return true;
      }
    }

    this.beforeKey = key;
    this.lastKeyDownTime = Date.now();
    return false;
  }
}

export const mathMacroPlugin = ViewPlugin.fromClass(MathMacroPluginValue);

export const mathMacroExtension = [
  mathMacroPlugin,
  EditorView.domEventHandlers({
    keydown: (e, view) => view.plugin(mathMacroPlugin)?.handleKeyDown(e) ?? false,
  }),
];
