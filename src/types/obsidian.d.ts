import type { App, DropdownComponent, MarkdownView, Modal, SliderComponent, TFile, ToggleComponent } from 'obsidian';
import type { LatexSuitePluginPublicApi } from 'obsidian-latex-suite';

declare module 'obsidian-typings' {
  interface Plugins {
    getPlugin(id: 'obsidian-latex-suite'): LatexSuitePluginPublicApi | null;
  }
}

export type NRootDirectory = '/' & { __brand?: 'root-directory' };
export type NPathNotStartingWithSlash = Exclude<string, `/${string}`> & { __brand?: 'not-starting-with-slash' };

export type NPath = NRootDirectory | NPathNotStartingWithSlash;

interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<FontData[]>;
  }

  interface PrintToPdfModal extends Modal {
    print: (printEl: HTMLDivElement, _: any, __: any) => Promise<void>;
    printToPdf: (args: {
      pageSize: PageSize;
      landscape: boolean;
      marginsType: `${MarginType}`;
      scaleFactor: number;
      scale: number;
      open: boolean;
      filepath: string;
    }) => Promise<void>;

    file: TFile;
    open: (view: MarkdownView, app: App) => void;

    pageSize: DropdownComponent;
    marginsType: DropdownComponent;
    landscape: ToggleComponent;
    scaleFactor: SliderComponent;
  }
}
