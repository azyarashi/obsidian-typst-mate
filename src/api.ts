export enum Status {
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
  Disabled,

  Disabling,
}

export const TypstMate: NonNullable<typeof window.TypstMate> = {
  status: 0 as Status,
  setStatus: (status: Status) => (TypstMate.status = status),
  isReady: () => TypstMate.status === Status.Ready,

  rendering: { isRendering: false, hasError: false, message: undefined },

  update: (status, rendering) => {
    if (status !== undefined) TypstMate.status = status;
    if (rendering !== undefined) TypstMate.rendering = rendering;
  },
  pluginVersion: undefined,
  typstVersion: undefined,
  wasm: undefined,
  tex2chtmlOrig: undefined,

  context: null,

  openTypstEditor: async () => {},
  renderTypstToSvg: async (typst: string) => {
    if (TypstMate === undefined) throw new Error('TypstMate is not loaded');
    if (!TypstMate.isReady()) throw new Error('TypstMate is not ready');

    const result = await TypstMate.wasm!.svge('', typst, { pageRanges: '0', overflow: true });
    const svg = result.svgs.at(0);
    if (svg === undefined) throw new Error('TypstMate failed to render SVG');
    return svg;
  },
};
