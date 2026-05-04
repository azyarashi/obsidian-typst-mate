import type { App, DropdownComponent, MarkdownView, Modal, SliderComponent, TFile, ToggleComponent } from 'obsidian';
import type { TarFile } from './untar-sync';

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

export interface GitHubAsset {
  name: string;
  url: string;
  size: number;
}

export type PackageAsset = TarFile[];
