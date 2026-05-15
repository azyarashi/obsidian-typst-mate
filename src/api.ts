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

export interface Status {
  state: State;
  message?: string;
}

export const TypstMate: NonNullable<typeof window.TypstMate> = {
  phase: 0,
  setPhase: (phase: Phase) => (TypstMate.phase = phase),
  isReady: () => TypstMate.phase === Phase.Ready,

  status: { state: State.Idle },
  setStatus: (status: Status) => (TypstMate.status = status),

  pluginVersion: undefined,

  wasm: undefined,
  typstVersion: undefined,

  ctx: null,

  // TODO
  openTypstEditor: async () => {},
  renderTypstToSvg: async (typst: string) => {
    if (TypstMate === undefined) throw new Error('TypstMate is not loaded');
    if (!TypstMate.isReady()) throw new Error('TypstMate is not ready');

    const result = await TypstMate.wasm!.svge('', typst, { pageRanges: '0', overflow: true });
    if (result.svgs.length === 0) throw new Error('TypstMate failed to render SVG');
    return result.svgs[0]!;
  },
};
