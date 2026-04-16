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

/**
 * status === Status.Ready のときのみ、以下のプロパティが利用可能
 */
export const TypstMate: NonNullable<typeof window.TypstMate> = {
  status: 0 as Status,
  rendering: { isRendering: false, hasError: false, message: undefined },
  isReady: () => TypstMate.status === Status.Ready,
  update: (status, rendering) => {
    if (status !== undefined) TypstMate.status = status;
    if (rendering !== undefined) TypstMate.rendering = rendering;
  },
  version: undefined,
  typstVersion: undefined,
  wasm: undefined,
  tex2chtml: undefined,
};
