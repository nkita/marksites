# template仕様

## 責務

`src/template/`は、スタンドアロンHTML文書の外枠と共通埋め込みCSSを所有する。Markdown解析、ファイル探索、HTTP配信は扱わない。

## ファイル

### `document.ts`

- `DocumentParts`: 事前に組み立てられたtitle、language、本文、パンくず、ファイルツリー、右サイドバー、コメント補助UI、各スタイルとスクリプトを受け取る内部型。
- `renderDocument(parts)`: doctypeからbody末尾までの単一HTML文字列を生成する。
- `trustedScript()`: marksites自身の実行スクリプトへ`data-marksites-script="true"`を付け、サーバーCSPの照合対象にする。

ファイルツリーがある場合だけ`has-file-tree` classとパンくず・ツリー用スタイルを追加する。ファイルツリーは本文上部のパンくずと同じ相対配置コンテナ内へ描画し、独立したカラムを作らない。highlight無効時はhighlightテーマを埋め込まない。スクリプトの順序はファイルツリー、更新日時、サイドバー、目次、コードブロック、コメントとする。

### `styles.ts`

- `githubMarkdownCss`: `github-markdown-css`のCSSをビルド済みモジュール読み込み時に取得する。
- `highlightCss`: highlight.jsのGitHubテーマを取得する。
- `documentStyles`: 本文と右サイドバーのグリッド、目次パネル、コードツール、更新日、基本レイアウトを定義する。下余白はbodyのpaddingではなく本文のgrid marginとして確保し、ページ末尾でもstickyサイドバーが親グリッド下端に押し上げられないようにする。目次の内側へ`min-height: 100%`を指定せず、外側パネルのpaddingによる不要なオーバーフローを防ぐ。タブとコメント固有のスタイルは各featureが所有する。
- `fileTreeStyles`: パンくず先頭の`Files`開閉ボタンとパスコピーボタン、パンくず直下のファイルツリーポップオーバー、コメント件数バッジを定義する。フォルダアイコン、`Files`、chevronを一つのボタンにまとめ、パス直後のコピー操作は枠なし、更新日は右端とする。パンくずの各テキストセグメントと区切りは共通の28px line-heightとbaselineで文字位置を揃え、Filesボタン全体と操作SVGは文字の視覚中心に合わせて1px下へ補正する。GitHub本文CSSが`details`へ付ける16pxの下余白は、ツリー内に限って0へリセットする。

CSSは生成HTMLへ直接埋め込み、CDNや実行時ファイル参照を追加しない。

## 不変条件

- 出力は完全なHTML文書で末尾改行を持つ。
- title、languageなど外部値は呼び出し側でエスケープ済みであることを前提とする。
- Markdown由来の任意scriptをtrusted scriptとしてマークしてはならない。
