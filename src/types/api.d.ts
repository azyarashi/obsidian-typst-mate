import type { EditorView } from '@codemirror/view';
import type { Remote } from 'comlink';
import type { Phase, State } from '../api';
import type { ParsedRegion } from '../editor/shared/utils/core';
import type WasmAdapter from '../libs/typstManager/worker';

export type * as Wasm from '../../pkg/typst_wasm';
export type { ParsedRegion, Status };

export interface Status {
  state: State;
  message?: string;
}

declare global {
  interface Window {
    TypstMate?: {
      /**
       * @public
       * @since 3.0.0
       * */
      pluginVersion?: string;

      /** @private */
      phase: Phase;
      /**
       * @public
       * @since 3.0.0
       * */
      isReady: () => boolean;
      /** @private */
      setPhase: (phase: Phase) => void;

      /** @private */
      wasm?: WasmAdapter | Remote<WasmAdapter>;
      /**
       * @public
       * @since 3.0.0
       * */
      typstVersion?: string;

      /**
       * @public
       * @since 3.0.0
       * */
      tex2chtmlOrig?: (math: string, options: { display?: boolean }) => HTMLElement;

      /**
       * @public
       * @since 3.0.0
       * */
      status: Status;
      /** @private */
      setStatus: (status: Status) => void;

      /**
       * @public
       * @since 3.0.0
       * */
      ctx: {
        view: EditorView;
        cursor: number;
        region: ParsedRegion;
      } | null;

      // *  excalidraw
      /**
       * @public
       * @since 3.0.0
       * */
      openTypstEditor: (typst: string, onUpdate?: (formula: string) => Promise<void>) => Promise<void>;
      /**
       * @public
       * @since 3.0.0
       * */
      renderTypstToSvg: (typst: string) => Promise<string>;
    };
  }
}
