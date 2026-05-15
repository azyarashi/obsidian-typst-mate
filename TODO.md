# TODO

- Actionの解析や, Action snippet - 上部にコマンドやキー用のほかん, trueを返したら終了
- アイコンの整理
- 補完
- font, packageのUI改善, プレロード
- watcher の実装
- parser 関連
  - Lexer の互換性を高める
  - Mode 検知を正しいロジックにする
- `{CODE}` を replace ではなく lastIndexOf から探して変更する
- ドキュメントの更新
- 型 readonly
- frontmatter

vim macro 保存
検索

  if (processor?.fitToNoteWidth) {
    const width = appUtils.getNoteWidth();
    rendererManager.wasm.setViewportWidth(width);
  } else {
    rendererManager.wasm.setViewportWidth('auto');
  }
  rendererManager.wasm.updateVariables();

comment/uncomment
