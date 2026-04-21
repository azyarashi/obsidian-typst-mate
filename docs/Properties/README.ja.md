# [プロパティ](https://obsidian.md/ja/help/properties) (YAML フロントマター)

[英語](./README.md) | 日本語

Markdown のメタデータとして使用されるプロパティとして、以下の 3 つをサポートしています。

> [!WARNING]
> 複数のノートを同時にエクスポートするプラグインと併用すると、うまく動作しない可能性があります。使用の際には注意してください。

## `difinitions/let` (リスト)

Typst の [let宣言](https://typst.app/docs/reference/scripting/#bindings) を行います。
そのノート中にある全ての Typst プロセッサーで使用できます。

```yaml
let: |
  fourier(f) = 1/sqrt(2 pi) integral_(-oo)^(oo) #f e^(-i omega t) dif t
  fourier_rev(f) = 1/sqrt(2 pi) integral_(-oo)^(oo) #f e^(i omega t) dif omega
```

> [!NOTE]
> `difinitions` プロパティまたは `let` プロパティのどちらか一方のみが使用できます。優先されるのは `difinitions` プロパティです。

## `import` (リスト)

Typst の [import宣言](https://typst.app/docs/reference/scripting/#modules) を行います。
そのノート中にある全ての Typst プロセッサーで使用できます。

```yaml
import: |
  "@preview/pavemat:0.2.0": pavemat
```

## `math-engine` (テキスト)

`mathjax` に指定すると、プロセッサーの設定に関わらず、そのノートで使用される**全てのインライン数式・ディスプレイ数式**のレンダリングエンジンが MathJax に固定されます。
この場合、設定「プロセッサーを MathJax に適用する (高度な設定タブ)」は適用されないことに注意してください。
