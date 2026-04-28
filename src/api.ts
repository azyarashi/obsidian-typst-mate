import type { Status } from './types/api';

export enum Phase {
  // Initial state
  Loading,

  // Preparing
  LoadingMathJax,

  DownloadingWasm,
  InitializingWasm,
  PreparingAssets,

  PreparingExtensions,
  RegisteringExtensions,

  RegisteringCommandsAndEvents,

  ApplyingPatches,

  // Final states
  Ready,
  Error,
  Disabling,
  Disabled,
}

export enum State {
  Idle,
  Rendering,
  Success,
  Error,
}

export type { Status };

export const TypstMate: NonNullable<typeof window.TypstMate> = {
  phase: 0 as Phase,
  setPhase: (phase: Phase) => (TypstMate.phase = phase),
  isReady: () => TypstMate.phase === Phase.Ready,

  status: { state: State.Idle },
  setStatus: (status: Status) => (TypstMate.status = status),

  pluginVersion: undefined,
  typstVersion: undefined,
  wasm: undefined,
  tex2chtmlOrig: undefined,

  ctx: null,

  // TODO
  openTypstEditor: async () => {},
  renderTypstToSvgs: async (typst: string) => {
    if (TypstMate === undefined) throw new Error('TypstMate is not loaded');
    if (!TypstMate.isReady()) throw new Error('TypstMate is not ready');

    const result = await TypstMate.wasm!.svge('', typst, { pageRanges: '0', overflow: true });
    if (result.svgs.length === 0) throw new Error('TypstMate failed to render SVG');
    return result.svgs;
  },
};
