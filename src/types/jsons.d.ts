declare module '@/data/shortcuts.json' {
  interface Shortcut {
    content: string;
    category: string;
    offset?: number;
  }
  const data: Record<string, Shortcut>;

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
