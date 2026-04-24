import type { EditorView } from '@codemirror/view';
import type { Remote } from 'comlink';
import type { Status } from '../api';
import type { ParsedRegion } from '../editor/shared/utils/core';
import type WasmAdapter from '../libs/typstManager/worker';

export type * as Wasm from '../../pkg/typst_wasm';
export type { ParsedRegion, Status };

export enum CompileState {
  Idle,
  Rendering,
  Success,
  Error,
}

export interface CompileStatus {
  state: CompileState;
  message: string;
}

export interface RenderingStatus {
  isRendering: boolean;
  hasError: boolean;
  message?: string;
}

declare global {
  interface Window {
    TypstMate?: {
      /** @private */
      status: Status;
      /** @public */
      isReady: () => boolean;

      /** @public */
      pluginVersion?: string;

      /** @private */
      wasm?: WasmAdapter | Remote<WasmAdapter>;
      /** @public */
      typstVersion?: string;

      /** @private */
      update: (status?: Status, rendering?: RenderingStatus) => void;
      /** @public */
      tex2chtmlOrig?: (math: string, options: { display?: boolean }) => HTMLElement;

      /** @public */
      context: {
        view: EditorView;
        cursor: number;
        region: ParsedRegion;
      } | null;
      /** @public */
      rendering: RenderingStatus;

      /** @private */
      setStatus: (status: Status) => void;

      // *  excalidraw
      /** @public */
      openTypstEditor: (typst: string, onUpdate?: (formula: string) => Promise<void>) => Promise<void>;
      /** @public */
      renderTypstToSvg: (typst: string) => Promise<string>;
    };
  }
}
