import { type App, Component, MarkdownRenderer, Modal } from 'obsidian';
import type { Diagnostic } from '@/libs/typstManager/worker';

export class DiagnosticModal extends Modal {
  constructor(app: App, diagnosticArray: Diagnostic[]) {
    super(app);

    let markdown = '';
    let i = 1;
    for (const diagnostic of diagnosticArray)
      markdown += `\
${i++}. **${diagnostic.message}**
${diagnostic.hints?.map((hint) => `- ${hint}`).join('\n')}
`;

    MarkdownRenderer.render(app, markdown, this.contentEl, '', new Component());
  }
}
