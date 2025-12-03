export interface Macro {
  category: string;
  name: string;
  description: string;
  kind: 'inline' | 'display' | 'codeblock';
  id: string;
  content: string;
  script: boolean;
}

export const DefaultNewMacro: Macro = {
  category: 'Uncategorized',
  name: 'new',
  description: '',
  kind: 'display',
  id: '',
  content: '#CURSOR',
  script: false,
};
