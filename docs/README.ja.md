# Typst Mate

[英語](../README.md) | 日本語

<a href="https://obsidian.md/">
  <img alt="Obsidian Plugin" src="https://img.shields.io/badge/Desktop%20%26%20Mobile-a78bfa?logo=obsidian&logoColor=white" />
</a>
<a href="https://typst.app/docs/changelog/">
  <img alt="Typst Version" src="https://img.shields.io/badge/v0.14.2-239dad?logo=typst&logoColor=white" />
</a>
<a href="https://deepwiki.com/azyarashi/obsidian-typst-mate">
  <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
</a>
<a href="https://www.buymeacoffee.com/azyarashi" target="_blank">
  <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 20px !important;width: 87px !important;" >
</a>

> [!WARNING]
> これは翻訳版のため、最新の変更が反映されていない可能性があります。

Typst Mate は、[Obsidian](https://obsidian.md) で使用されている従来の数式レンダリングエンジン ([MathJax](https://www.mathjax.org/)) を [Typst](https://typst.app/) に置き換える Obsidian のプラグインです。
コードブロックでの利用や、一部の数式で利用されるレンダリングエンジンの変更、さらに [LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite) との併用もサポートしています。
また、体験を向上させる多くの[拡張機能](#拡張機能)が含まれています。

> [!IMPORTANT]
> より良いタイピング体験のために、[No More Flickering Inline Math](https://www.obsidianstats.com/plugins/inline-math) の導入を**強く**推奨します。

## 基本的な機能

- プロセッサー (強力なプリアンブルやテンプレートシステム)
- Typst ファイルの編集やプレビュー、クイックプレビューや埋め込み
- テーマのテキスト色を自動で参照する
- カスタムフォントの利用 (システムフォントのインポートはデスクトップアプリのみ)
- ほぼ全てのパッケージに対応
- 変換器などの多くのツール
- SVG などをそのままコピーできるコンテキストメニュー
- カスタムできるスタイル
- テーブルや引用におけるディスプレイ数式の修正

## 拡張機能

| 名前 | 説明 | 環境 |
| :---- | :---- | :---: |
| Auto Complete | <details>変数やパッケージ, フォント情報などを補完します</details> | MT |
| Symbol Conceal | <details>Math モード内の記号をユニコード文字で表示します</details> | MT |
| Pair Highlight | <details>括弧などのペアをハイライトします</details> | MT |
| Tab Jump | <details><kbd>Tab</kbd> キーでさまざまな場所にジャンプします.</details> | MT |
| Click Jump | <details></details> | MT |
| Tooltip | <details></details> | MT |
| Formatter | <details></details> | MT |
| Syntax Highlight | <details></details> | MT |
| Linter | <details></details> | MT |
| TypstMate Action | <details></details> | MT |
| Inline Preview | <details></details> | M |
| Code Block Preview | <details></details> | M |
| Code Jump | <details></details> | T |
| Vim | <details></details> | T |
| Indent Rainbow | <details></details> | T |
| Error Lens | <details></details> | T |
| Folding | <details></details> | T |

## 互換性

### 公式の機能

- `PDFにエクスポート`

### コミュニティプラグイン

- [Obsidian LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite)
- [Excalidraw](https://www.obsidianstats.com/plugins/obsidian-excalidraw-plugin)
- [Equation Citator](https://github.com/FRIEDparrot/obsidian-equation-citator) (`Advanced Settings` > `Enable Typst Mode` を有効にし、プラグインをリロードする必要があります)
- [Markmind](https://www.obsidianstats.com/plugins/obsidian-markmind)
- [No more flickering inline math](https://www.obsidianstats.com/plugins/inline-math)
- [Better Export PDF](https://www.obsidianstats.com/plugins/better-export-pdf)
- [Export Image plugin](https://www.obsidianstats.com/plugins/obsidian-export-image)
- [Webpage HTML Export](https://www.obsidianstats.com/plugins/webpage-html-export)
  (`Style Options` にプラグインの CSS を含めてください)

コミュニティプラグインでエクスポートする際には、バックグラウンドレンダリングを無効にしてください。
プラグインの設定タブまたはステータスバー (デスクトップアプリのみ) から変更できます。

## 謝辞

Typst Mate は、主に以下のオープンソースプロジェクトを利用しています。

- [Typst](https://typst.app/) - モダンで強力な組版システム
- [TyLax](https://github.com/scipenai/tylax) - 高速で互換性の高い変換ツール
- [Detypify](https://github.com/QuarticCat/detypify) - 手書きの記号を認識するツール
- [Quiver](https://github.com/varkor/quiver) - 可換図式を作成するツール
- [unicode-math](https://github.com/latex3/unicode-math) - ([LaTeX Project Public License (LPPL) 1.3c](https://ctan.org/license/lppl1.3c) の下で配布)

また、このプラグインを作成するにあたり以下のオープンソースプロジェクトを参考にしました。

- [Obsidian Letex Suite](https://github.com/artisticat1/obsidian-latex-suite)

これらの開発者の方々に深く感謝します！

## プライバシーに関する声明

Obsidian が定める[デベロッパーポリシー](https://docs.obsidian.md/Developer+policies)に基づき、以下の情報を開示します。

### 外部ファイルへのアクセス

- (デスクトップアプリのみ) 保管庫内にパッケージが見つからない場合、ダウンロードの前に、Typst CLI で使用されるパッケージの場所にアクセスします。正確な場所は、[typst/packages](https://github.com/typst/packages/blob/main/README.md) を参照してください。

### ネットワークへのアクセス

- 初回起動時、またプラグインのアップデート時に Wasm のダウンロードを Github のサーバーから行います。
- パッケージリストの取得及びパッケージのダウンロードを Typst のサーバーから行います。

### 広告

- 自身の Buy me a coffee のリンクが設定タブ内の Advanced Settings に記載されています。

### その他

- ユーザー自身が作成する TypstMate Actions の内容によっては、特にアクションが `script` または `command` に指定されているもので、以上の事項 (外部ファイルへのアクセス、ネットワークへのアクセス) が発生する場合がありますが、初期設定では発生しません。
- (デスクトップアプリのみ) ユーザーが記述した Typst のコードや使用するパッケージによっては、含まれる文 (`import`、`include`) や関数 (`image`、`load`) で、以上の事項 (外部ファイルへのアクセス) が発生する場合がありますが、初期設定では発生しません。
- (デスクトップアプリのみ) 1 度読み込まれたファイルの削除や変更を監視する機能があります。この機能はユーザーが別途追加する必要があり、インストールは Github のサーバーから行います。初期設定では無効になっています。
- フルアクセスに支払いやアカウントは必要ありません。
- Typst Mate のサーバーは存在しません。Typst や GitHub 等の外部サーバーへのアクセス記録を除き、いかなる場合もユーザーの情報を収集・送信することはありません。ユーザーのプラグイン設定は、全て保管庫内に保存されています。
- ソースコードはオープンで、GitHub 上のパブリックリポジトリとして存在しています。貢献を歓迎しています。
- 問題の報告や機能リクエストを行いたい場合は、GitHub で [issueを作成する](https://github.com/azyarashi/obsidian-typst-mate/issues/new) か、 [Discord](https://discord.com/channels/@me) で @azyarashi までご連絡ください。
