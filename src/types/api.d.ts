import type { Remote } from 'comlink';
import type { Status } from '../api';
import type { ParsedRegion } from '../editor/shared/utils/core';
import type WasmAdapter from '../libs/typstManager/worker';

export * as Wasm from '../../pkg/typst_wasm';
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

declare global {
  interface Window {
    TypstMate?: {
      status: Status;
      /** @public */
      isReady: () => boolean;

      /** @public */
      pluginVersion?: string;

      /** @public */
      wasm?: WasmAdapter | Remote<WasmAdapter>;
      /** @public */
      typstVersion?: string;

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

      setStatus: (status: Status) => void;

      /** excalidraw */
      openTypstEditor: (typst: string, onUpdate?: (formula: string) => Promise<void>) => Promise<void>;
    };
  }
}
