import type { EditorView } from '@codemirror/view';
import { SyntaxMode } from '@typstmate/typst-syntax';
import { type Command, Notice } from 'obsidian';
import { formatterSettingsFacet } from '@/editor/shared/extensions';
import { formatTypst } from '@/editor/shared/extensions/Formatter';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { t } from '@/i18n';
import { appUtils } from '../appUtils';

export const formatTypstCommand: Command = {
  id: 'run-typstyle',
  name: t('commands.formatTypst'),
  callback: async () => {
    const view = appUtils.getActiveTypstView()?.view ?? appUtils.getActiveMarkdownView()?.editor.cm;
    if (!view) return;

    formatView(view);
  },
};

// TODO: カーソル位置の復元
export async function formatView(view: EditorView) {
  const region = getActiveRegion(view);
  if (!region) return;

  const settings = view.state.facet(formatterSettingsFacet);
  if (!settings) return;

  const innerFrom = region.from + region.skip;
  const innerTo = region.to;
  const rawCode = view.state.sliceDoc(innerFrom, innerTo);
  if (rawCode.includes('// @typstyle off all') || rawCode.includes('/* @typstyle off all */')) return;

  let minIndent = 0;
  let deIndentedCode = rawCode;
  if (region.processor) {
    const lines = rawCode.split('\n');
    const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length > 0) {
      minIndent = Math.min(...nonEmptyLines.map((l) => l.match(/^\s*/)?.[0].length ?? 0));
      if (minIndent > 0) {
        deIndentedCode = lines.map((l) => (l.trim().length > 0 ? l.slice(minIndent) : l)).join('\n');
      }
    }
  }

  let prefix = '';
  let suffix = '';
  if (region.mode === SyntaxMode.Math) {
    prefix = '$ ';
    suffix = ' $';
  } else if (region.mode === SyntaxMode.Code) {
    prefix = '#{\n';
    suffix = '\n}';
  }
  const source = prefix + deIndentedCode + suffix;

  try {
    const selection = view.state.selection.main;
    let range: [number, number] | undefined;

    if (!selection.empty) {
      const selFrom = Math.max(selection.from, innerFrom) - innerFrom;
      const selTo = Math.min(selection.to, innerTo) - innerFrom;

      if (!region.processor && selFrom < selTo) {
        range = [selFrom + prefix.length, selTo + prefix.length];
      }
    }

    const result = await formatTypst(source, settings, range);

    const resFrom = result.range[0];
    const resTo = result.range[1];

    let finalContent = result.content;

    const isNeedLineBreak = region.kind === 'display' && deIndentedCode.startsWith('\n');
    if (isNeedLineBreak) {
      finalContent = `\n${finalContent.trim()}\n`;
    }

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
        selection: range ? { anchor: finalFrom, head: finalFrom + finalContent.length } : undefined,
      });
    }
  } catch (e) {
    console.error('Formatter error:', e);
    new Notice(`Failed to format: ${e}`);
  }
}
