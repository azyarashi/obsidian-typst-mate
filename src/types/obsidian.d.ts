import type { LatexSuitePluginPublicApi } from 'obsidian-latex-suite';

declare module 'obsidian-typings' {
  interface Plugins {
    getPlugin(id: 'obsidian-latex-suite'): LatexSuitePluginPublicApi | null;
  }
}
