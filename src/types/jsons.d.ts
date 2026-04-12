declare module '@/data/actions/long-press.json' {
  interface Shortcut {
    content: string;
    category: string;
  }
  const data: Record<string, Shortcut>;

  export default data;
}

declare module '@/data/actions/type.json' {
  const data: Action[];

  export default data;
}

declare module '@/data/symbols.json' {
  interface SymbolData {
    sym: string;
    unicName: string;
    name: string;
    shorthand: string | null;
    mathClass: string;
    latexName: string;
  }
  const data: Record<string, SymbolData>;

  export default data;
}
