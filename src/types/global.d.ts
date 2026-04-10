import type { Remote } from 'comlink';
import type { App, DropdownComponent, MarkdownView, Modal, SliderComponent, TFile, ToggleComponent } from 'obsidian';

import type { Status } from '@/api';
import type WasmAdapter from '@/libs/typstManager/worker';
import type { MarginType, PageSize } from '../../.vscode/print';
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

    TypstMate?: {
      status: Status;
      rendering: RenderingStatus;
      version?: string;
      typstVersion?: string;
      wasm?: WasmAdapter | Remote<WasmAdapter>;

      isReady: () => boolean;
      update: (status?: Status, rendering?: RenderingStatus) => void;
      /** Original MathJax tex2chtml */
      tex2chtml?: (math: string, options: { display?: boolean }) => HTMLElement;
    };
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

export interface RenderingStatus {
  isRendering: boolean;
  hasError: boolean;
  path?: string;
}

export interface GitHubAsset {
  name: string;
  url: string;
  size: number;
}

export type PackageAsset = TarFile[];
