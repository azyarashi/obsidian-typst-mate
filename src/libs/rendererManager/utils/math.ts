import { DEFAULT_SETTINGS } from '@/data/settings';
import type { DisplayProcessor, InlineProcessor, MathProcessor } from '@/libs/processor';
import { settingsManager } from '@/libs/settingsManager';

const NO_MORE_FLICKERING_MATH_DELIMITER = '{}';
const ZWSP = '​';
const BR_TAG = '<br>';
const BR_REPLACEMENT = `${ZWSP.repeat(BR_TAG.length - 1)}\n`;
const QUOTE_RE = /\n([ \t]*> )/g;

interface CMMathInfo {
  eqStart: number;
  eqEnd: number;
  processor: MathProcessor;
}

/**
 * CMMath は, `({} )(id)(Inline Processor における区切り文字 :)(数式)( {})` の形式をとる
 */
export function extarctCMMath(codeRaw: string, display: boolean): CMMathInfo {
  /** {}, id, : を含まない */
  let eqStart = 0;
  /** {} を含まない */
  let eqEnd = 0;
  let processor: MathProcessor;

  if (!display) {
    // * Inline Math
    if (codeRaw.startsWith(NO_MORE_FLICKERING_MATH_DELIMITER)) {
      if (codeRaw.at(2) === ' ') eqStart += 3;
      else eqStart += 2;
    }
    if (codeRaw.endsWith(NO_MORE_FLICKERING_MATH_DELIMITER)) {
      if (codeRaw.at(-3) === ' ') eqEnd += 3;
      else eqEnd += 2;
    }

    processor = getInlineProcessorByCode(codeRaw.slice(eqStart)); // ? code.length - eqEnd はプロセッサーの取得に不要
    if (0 < processor.id.length) eqStart += processor.id.length + 1; // ? : の分
  } else {
    // * Display Math
    processor = getDisplayProcessorByCode(codeRaw);
    if (0 < processor.id.length) eqStart += processor.id.length;
  }

  return { eqStart, eqEnd, processor };
}

export function sanitizeDisplayMathCode(code: string): string {
  code = code.replaceAll(BR_TAG, BR_REPLACEMENT); // ? 文字の長さを合わせる
  code = code.replace(QUOTE_RE, (_, s) => `\n${ZWSP.repeat(s.length)}`); // ? 文字の長さを合わせる
  return code;
}

function getInlineProcessorByCode(code: string): InlineProcessor {
  const inlineProcessors = settingsManager.settings.processor.inline?.processors;
  return (
    inlineProcessors?.find((p) => code.startsWith(`${p.id}:`)) ??
    inlineProcessors.at(-1) ??
    DEFAULT_SETTINGS.processor.inline!.processors.at(-1)!
  );
}

function getDisplayProcessorByCode(code: string): DisplayProcessor {
  const displayProcessors = settingsManager.settings.processor.display?.processors;
  return (
    displayProcessors?.find((p) => code.startsWith(p.id)) ??
    displayProcessors?.at(-1) ??
    DEFAULT_SETTINGS.processor.display!.processors.at(-1)!
  );
}
