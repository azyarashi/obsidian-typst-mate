import { State, type Status } from './types/api';

export { State, type Status };

export enum Phase {
  // 初期状態
  Loading,

  // 準備中
  LoadingMathJax,

  DownloadingWasm,
  InitializingWasm,
  PreparingAssets,

  PreparingExtensions,
  RegisteringExtensions,

  RegisteringCommandsAndEvents,

  ApplyingPatches,

  // 最終状態
  Ready,
  Error,
  Disabling,
  Disabled,
}

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
