import SYMBOLS_BY_NAME from '@/data/symbols.json';

const SYMBOLS_BY_LATEX = Object.fromEntries(
  Object.entries(SYMBOLS_BY_NAME)
    .filter(([_, v]) => v.latexName !== '')
    .map(([_, v]) => [v.latexName.replace(/\\/g, ''), v]),
);

// ? サジェストの体験向上のために, 短い順でソート
const NAMES = Object.keys(SYMBOLS_BY_NAME).sort((a, b) => a.length - b.length);
const LATEXES = Object.keys(SYMBOLS_BY_LATEX).sort((a, b) => a.length - b.length);

export function searchSymbols(rawQuery: string): SymbolData[] {
  switch (rawQuery.at(0)) {
    // LaTeX で検索
    case '\\':
      return searchSymbolInternal(rawQuery.replace(/\\/g, ''), LATEXES, SYMBOLS_BY_LATEX);
    // Typst で検索
    default:
      return searchSymbolInternal(rawQuery, NAMES, SYMBOLS_BY_NAME);
  }
}

function searchSymbolInternal(query: string, keys: string[], dict: SymbolsDict): SymbolData[] {
  // 含んでいるものでフィルターする.
  const includes = keys.filter((key) => key.includes(query));

  // 指定の接頭辞で始まるものでフィルターする.
  const prefixes = includes.filter((key) => key.startsWith(query));

  // `.` を含まない基本的な記号を取り出す.
  const bases = prefixes.filter((key) => !key.includes('.')).map((key) => ({ ...dict[key]!, kind: 'base' }));

  // `.` を含むバリエーションの記号を取り出す.
  const variants = prefixes
    .filter((key) => key.includes('.'))
    .map((key) => ({ ...dict[key]!, kind: bases.length === 0 ? 'base' : 'variant' }));

  // それ以外の記号を取り出す.
  const substrings = includes
    .filter((key) => !prefixes.includes(key))
    .map((key) => ({ ...dict[key]!, kind: 'substring' }));

  return [...bases, ...variants, ...substrings] as SymbolData[];
}

export interface SymbolData {
  sym: string;
  unicName: string;
  name: string;
  shorthand: string | null;
  mathClass: string;
  latexName: string;
  // ? サジェストの優位度をつけるためで, データにはない. TS 側で付与する.
  kind?:
    | 'bookmark' // お気に入り // TODO 実装
    | 'user' // ユーザー定義 // TODO 実装
    | 'base' // `.` を含まない
    | 'variant' // `.` を含む
    | 'substring'; // 含むだけ
}

interface SymbolsDict {
  [key: string]: SymbolData;
}
