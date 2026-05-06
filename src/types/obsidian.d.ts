import type { LatexSuitePluginPublicApi } from 'obsidian-latex-suite';

declare module 'obsidian-typings' {
  interface Plugins {
    getPlugin(id: 'obsidian-latex-suite'): LatexSuitePluginPublicApi | null;
  }
}

export type NRootDirectory = '/' & { __brand?: 'root-directory' };
export type NPathNotStartingWithSlash = Exclude<string, `/${string}`> & { __brand?: 'not-starting-with-slash' };

export type NPath = NRootDirectory | NPathNotStartingWithSlash;
