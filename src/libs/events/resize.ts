import { editorHelper } from '@/libs';
import type TypstSVGElement from '@/ui/elements/SVG';

export function onResize() {
  const svgs = document.querySelectorAll<TypstSVGElement>(
    'typstmate-svg.typstmate-display, typstmate-svg.typstmate-codeblock',
  );
  if (svgs.length === 0) return;

  // preview
  // appUtils.app.workspace.getLeavesOfType("markdown").find(l => (l.view as MarkdownView).previewMode.docId === ctx.docId)?.view

  const width = rendererManager.getNoteWidth(view);
  rendererManager.wasm.setViewportWidth(width);
  rendererManager.wasm.updateVariables();
  for (const svg of svgs) svg.render();
}
