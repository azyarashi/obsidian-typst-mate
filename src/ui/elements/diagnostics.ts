import '@/editor/shared/extensions/decorations/Diagnostic.css';

export interface DiagnosticInfo {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  hints?: string[];
}

export function renderDiagnosticMessage(diag: DiagnosticInfo): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('typstmate-diag');

  const messageEl = diag.severity === 'error' ? document.createElement('strong') : document.createElement('em');
  messageEl.textContent = diag.message;
  container.appendChild(messageEl);

  if (diag.hints && 0 < diag.hints.length) {
    const hintsEl = document.createElement('div');
    hintsEl.classList.add('typstmate-diag-hints');
    diag.hints.forEach((hint, i) => {
      const hintLine = document.createElement('div');
      hintLine.textContent = `${i + 1}. ${hint}`;
      hintsEl.appendChild(hintLine);
    });
    container.appendChild(hintsEl);
  }
  return container;
}
