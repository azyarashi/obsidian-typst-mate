declare module '@/data/shortcuts.json' {
  export interface Shortcut {
    content: string;
    category: string;
    offset?: number;
  }
  const data: Record<string, Shortcut>;

  export default data;
}
