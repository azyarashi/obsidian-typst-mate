import { SyntaxMode } from '@typstmate/typst-syntax';
import type { EditorView } from '@codemirror/view';
import { formatTypst, formatterSettingsFacet, getActiveRegion } from '@/editor';
import { RenderingEngine } from '@/libs';
import { t } from '@/libs/i18n';
import { consoleWarn } from '@/utils/notice';
import { appUtils } from '../appUtils';
import type { CommandGen } from '.';

export const formatTypstCommand: CommandGen = () => {
  return {
    id: 'run-typstyle',
    name: t('commands.formatTypst'),
    callback: async (cm?: EditorView) => {
      const view = cm ?? appUtils.getActiveTypstView()?.view ?? appUtils.getActiveMarkdownView()?.editor.cm;
      if (!view) return;

      formatTypstInView(view);
    },
  };
};

// TODO
export async function formatTypstInView(view: EditorView) {
  // 判定
  const region = getActiveRegion(view);
  if (!region) return;
  if (region.mode === SyntaxMode.Plain || region.processor?.renderingEngine === RenderingEngine.MathJax) return;

  const settings = view.state.facet(formatterSettingsFacet);
  if (!settings) return;

  const innerFrom = region.from + region.skip;
  const innerTo = region.to;
  const rawCode = view.state.sliceDoc(innerFrom, innerTo);
  if (rawCode.includes('// @typstyle off all') || rawCode.includes('/* @typstyle off all */')) return;

  // 調整
  const deindentedCode = region.processor !== undefined ? deindentText(rawCode) : rawCode;

  let prefix = '';
  let suffix = '';
  if (region.mode === SyntaxMode.Math) {
    prefix = '$ ';
    suffix = ' $';
  } else if (region.mode === SyntaxMode.Code) {
    prefix = '#{\n';
    suffix = '\n}';
  }
  const source = prefix + deindentedCode + suffix;

  try {
    const cursor = view.state.selection.main.head;
    const selection = view.state.selection.main;
    let range: [number, number] | undefined;

    if (!selection.empty) {
      const selFrom = Math.max(selection.from, innerFrom) - innerFrom;
      const selTo = Math.min(selection.to, innerTo) - innerFrom;

      if (!region.processor && selFrom < selTo) {
        range = [selFrom + prefix.length, selTo + prefix.length];
      }
    }

    // 実行

    const result = await formatTypst(source, settings, range);

    const resFrom = result.range[0];
    const resTo = result.range[1];

    // 最終調整
    let finalContent = result.content;

    const isNeedLineBreak = region.kind === 'display' && deindentedCode.startsWith('\n');
    if (isNeedLineBreak) finalContent = `\n${finalContent.trim()}\n`;

    let finalFrom = resFrom - prefix.length + innerFrom;
    let finalTo = resTo - prefix.length + innerFrom;

    if (prefix && resFrom < prefix.length) {
      const overlap = prefix.length - resFrom;
      finalContent = finalContent.slice(overlap);
      finalFrom += overlap;
    }

    if (suffix && resTo > source.length - suffix.length) {
      const overlap = resTo - (source.length - suffix.length);
      finalContent = finalContent.slice(0, -overlap);
      finalTo -= overlap;
    }

    if (region.processor) {
      finalFrom = innerFrom;
      finalTo = innerTo;
      const cleanContent = result.content.slice(prefix.length, result.content.length - suffix.length);
      finalContent = isNeedLineBreak ? `\n${cleanContent.trim()}\n` : cleanContent;
    }

    const currentContent = view.state.sliceDoc(finalFrom, finalTo);
    if (finalContent !== currentContent) {
      view.dispatch({
        changes: { from: finalFrom, to: finalTo, insert: finalContent },
        selection: range
          ? { anchor: finalFrom, head: finalFrom + finalContent.length }
          : {
              anchor: finalFrom + finalContent.length - (innerTo - cursor),
              head: finalFrom + finalContent.length - (innerTo - cursor),
            },
      });
    }
  } catch (e) {
    consoleWarn('formatTypstInView failed', e);
  }
}

function deindentText(text: string): string {
  let minIndent = 0;

  const lines = text.split('\n');
  const nonEmptyLines = lines.filter((l) => 0 < l.trim().length);
  if (0 < nonEmptyLines.length) {
    minIndent = Math.min(...nonEmptyLines.map((l) => l.match(/^\s*/)?.[0].length ?? 0));
    if (0 < minIndent) {
      text = lines.map((l) => (0 < l.trim().length ? l.slice(minIndent) : l)).join('\n');
    }
  }

  return text;
}
