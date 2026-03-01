# TODO

- Fit To Note Width の実装
  `MarkdownView` から `view?.editor.editorComponent?.editorEl.find('.cm-content')?.clientWidth`, fallback は `getComputedStyle(document.body).getPropertyValue('--line-width') ?? 700`. 0.75 倍を忘れない
- offset の統一
  TypstElement 側で計算するように変更
- parser 関連
  - Lexer の互換性を高める
  - Mode 検知を正しいロジックにする
