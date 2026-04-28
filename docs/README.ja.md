# Typst Mate

<a href="https://obsidian.md/">
  <img alt="Obsidian Plugin" src="https://img.shields.io/badge/Desktop%20%26%20Mobile-a78bfa?logo=obsidian&logoColor=white" />
</a>
<a href="https://typst.app/docs/changelog/">
  <img alt="Typst Version" src="https://img.shields.io/badge/v0.14.2-239dad?logo=typst&logoColor=white" />
</a>
<a href="https://www.buymeacoffee.com/azyarashi" target="_blank">
  <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 20px !important;width: 87px !important;" >
</a>
<a href="https://deepwiki.com/azyarashi/obsidian-typst-mate">
  <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
</a>

\[[English](./README.md) | 日本語\]

> [!INFO]
> これは翻訳版です。最新の変更が反映されていない可能性があります。

Typst Mate は、[Obsidian](https://obsidian.md) で使用されている従来の数式レンダリングエンジン ([MathJax](https://www.mathjax.org/)) を [Typst](https://typst.app/) に置き換えるプラグインです。
コードブロックでの利用やエクスポート機能との互換性だけでなく、一部のノートや数式で利用されるレンダリングエンジンの変更、さらに [LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite) との併用もサポートしています。
また、体験を向上させる多くの [拡張機能](#拡張機能) が含まれています。

> [!IMPORTANT]
> より良いタイピング体験のために、[No More Flickering Inline Math](https://www.obsidianstats.com/plugins/inline-math) の導入を**強く**推奨します。
>
> 無効               | 有効
> :-----------------------:|:------------------------:
> ![無効](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/off.gif?raw=true) | ![有効](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/on.gif?raw=true)

## 基本的な機能

- [プロセッサー](./Processor/README.ja.md) と呼ばれる、強力なプリアンブルやテンプレートシステム
- [`.typ` エディター](./Typ-Editor/README.ja.md) と呼ばれる、Typst ファイルの編集やプレビュー、クイックプレビューや埋め込み
- [テーマのテキスト色を自動で参照する](./Renderer/README.ja.md)
- [高度なスニペット機能](./Typst-Mate-Actions/README.ja.md)
- カスタムフォントの利用や全てのパッケージへの対応
- SVG などをそのままコピーできる右クリックメニュー
- [カスタムできるスタイル](./Processor/README.ja.md)
- 変換器などの多くのツール
- インライン数式の正しい位置調整や、テーブルや引用におけるディスプレイ数式の修正

## 拡張機能

| 名前                      | 説明                                                                                          |
| :---------------------- | :------------------------------------------------------------------------------------------ |
| Auto Complete           | 変数やパッケージ、フォント情報などを補完します。                                                                    |
| Symbol Conceal          | [`sym` モジュール](https://typst.app/docs/reference/symbols/sym/) にアクセスしている文字列を検知し、対応する文字で表示します。 |
| Pair Highlight          | 括弧などのペアをハイライトします。                                                                           |
| Tab Jump                | [詳細](./Tab-Jump/README.ja.md)                                                               |
| Preview Jump            | プレビューをクリックすることで、対応するコード位置に飛びます。                                                             |
| Code Jump               | コードを <kbd>Ctrl</kbd> クリックすることで、対応するプレビュー位置に飛びます。                                            |
| Tooltip                 | コードをホバーしてツールチップを表示します。                                                                      |
| Formatter               | [Typstyle](https://typstyle-rs.github.io/typstyle/) によるフォーマットを行います。                         |
| Syntax Highlight        | 構文をハイライトします。                                                                                |
| Linter                  | エラーや警告を波線で表示します。                                                                            |
| Typst Mate Action       | [詳細](./Typst-Mate-Actions/README.ja.md)                                                     |
| Inline Preview          | インライン数式のプレビューを表示する吹き出しを追加します。                                                               |
| Codeblock Preview       | コードブロックの下部にプレビューを表示します。                                                                     |
| LaTeX Suite Integration | [詳細](./LaTeX-Suite/README.ja.md)                                                            |
| Vim                     | [Vimee](https://vimee.dev) による Vim キーバインドを有効にします。                                           |
| Indent Rainbow          | https://open-vsx.org/extension/oderwat/indent-rainbow                                       |
| Error Lens              | https://open-vsx.org/extension/usernamehw/errorlens                                         |
| Folding                 | 複数行に連なる要素を折りたたみします。                                                                         |

## 互換性

### 公式の機能

- `PDFにエクスポート`

### プラグイン

#### 数式系

- [LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite)
  詳細は [こちら](./LaTeX-Suite/README.ja.md) をご確認ください。
- [No More Flickering Inline Math](https://www.obsidianstats.com/plugins/inline-math)
- [Equation Citator](https://github.com/FRIEDparrot/obsidian-equation-citator)
  `Advanced Settings` から `Enable Typst Mode` を有効にし、プラグインをリロードする必要があります。

#### 描画系

- [Excalidraw](https://www.obsidianstats.com/plugins/obsidian-excalidraw-plugin)
- [Markmind](https://www.obsidianstats.com/plugins/obsidian-markmind)

#### 出力系

コミュニティプラグインによるエクスポートを行う際には、バックグラウンドレンダリングを無効にしてください。
プラグインの設定タブまたはステータスバー (デスクトップアプリのみ) から変更できます。

- [Better Export PDF](https://www.obsidianstats.com/plugins/better-export-pdf)
- [Export Image plugin](https://www.obsidianstats.com/plugins/obsidian-export-image)
- [Webpage HTML Export](https://www.obsidianstats.com/plugins/webpage-html-export)
  (`Style Options / Include CSS from Plugins` にプラグインの CSS を含めてください)

## 謝辞

Typst Mate は、主に以下のオープンソースプロジェクトを利用しています。

- [Typst](https://typst.app/) - モダンで強力な組版システム
- [TyLax](https://github.com/scipenai/tylax) - 高速で互換性の高い変換ツール
- [Typstyle](https://typstyle-rs.github.io/typstyle/) - 美しく信頼性の高いフォーマッター
- [Detypify](https://github.com/QuarticCat/detypify) - 手書きの記号を認識するツール
- [Quiver](https://github.com/varkor/quiver) - 可換図式を作成するツール
- [unicode-math](https://github.com/latex3/unicode-math) - ([LaTeX Project Public License (LPPL) 1.3c](https://ctan.org/license/lppl1.3c) の下で配布)

また、このプラグインを作成するにあたり、以下のオープンソースプロジェクトを参考にしました。

- [Obsidian Latex Suite](https://github.com/artisticat1/obsidian-latex-suite)

これらの開発者の方々に深く感謝します！

## プライバシーに関する声明

Obsidian が定める [デベロッパーポリシー](https://docs.obsidian.md/Developer+policies) に基づき、以下の情報を開示します。

### 外部ファイルへのアクセス

- (デスクトップアプリのみ) 保管庫内にパッケージが見つからない場合、保管庫内へのダウンロードを行う前に Typst CLI で使用されるパッケージの場所にアクセスします。正確な場所は、[typst/packages](https://github.com/typst/packages/blob/main/README.md) を参照してください。

### ネットワークへのアクセス

- 初回起動時やプラグインのアップデート時に、デフォルトの Typst Mate アクションや Wasm のダウンロードを Github のサーバーから行います。
- パッケージリストの取得及びパッケージのダウンロードを Typst のサーバーから行います。

### その他

- ユーザー自身が作成する Typst Mate アクションの内容、そしてユーザーが記述した Typst のコードや使用するパッケージによっては、以上の事項 (外部ファイルへのアクセス、ネットワークへのアクセス) が発生する場合があります。
- プラグインへのフルアクセスに支払いやアカウントは必要ありませんが、このプロジェクトを支援していただける場合は、[azyarashi@Buy Me a Coffee](https://buymeacoffee.com/azyarashi) で 3$ から寄付を行えます。
- ソースコードはオープンで、[GitHub 上のパブリックリポジトリ](https://github.com/azyarashi/obsidian-typst-mate) として存在しています。機能追加、問題修正、そして翻訳の追加・修正に関する [貢献](../CONTRIBUTING.md) を歓迎しています。
- 問題の報告や機能のリクエストを行いたい場合は、[GitHub で issueを作成する](https://github.com/azyarashi/obsidian-typst-mate/issues/new) か、 [azyarashi@Discord](https://discord.com/users/710497575232340060) までご連絡ください。
