import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightTrailingWhitespace,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { TextFileView as ObsidianTextFileView, type TFile } from 'obsidian';

export class TextFileView extends ObsidianTextFileView {
  static viewtype = 'text-file';
  view!: EditorView;

  override getViewType() {
    return TextFileView.viewtype;
  }

  override getDisplayText() {
    return this.file?.name ?? 'Text File';
  }

  override getViewData() {
    return this.view?.state.doc.toString() ?? '';
  }

  override setViewData() {
    // データの設定は onLoadFile で行うため、ここでは何もしない
  }

  override async onClose() {
    this.view?.destroy();
  }

  private extensionCompartment = new Compartment();

  private buildExtensions() {
    // TODO
    return [
      EditorView.lineWrapping,
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      highlightTrailingWhitespace(),
      history(),
      closeBrackets(),
      keymap.of([
        ...closeBracketsKeymap,
        ...historyKeymap,
        { key: 'Tab', run: indentMore },
        { key: 'Shift-Tab', run: indentLess },
        ...standardKeymap,
      ]),
    ];
  }

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();

    const fileContent = await this.app.vault.read(file);

    const startState = EditorState.create({
      doc: fileContent,
      extensions: [this.extensionCompartment.of(this.buildExtensions())],
    });

    this.view = new EditorView({
      state: startState,
      parent: this.contentEl,
    });
    this.view.dom.style.height = '100%';
  }

  override async save(clear?: boolean): Promise<void> {
    if (!this.file) return;

    const content = this.view.state.doc.toString();
    await this.app.vault.modify(this.file, content);

    await super.save(clear);
  }

  override clear() {
    this.view?.destroy();
  }
}
