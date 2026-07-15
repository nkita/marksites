# template仕様

## 責務

`src/template/`は、スタンドアロンHTML文書の外枠と共通埋め込みCSSを所有する。Markdown解析、ファイル探索、HTTP配信は扱わない。

## ファイル

### `document.ts`

- `DocumentParts`: 事前に組み立てられたtitle、language、本文、パンくず、ファイルツリー、目次、コメント、各スクリプトを受け取る内部型。
- `renderDocument(parts)`: doctypeからbody末尾までの単一HTML文字列を生成する。
- `trustedScript()`: marksites自身の実行スクリプトへ`data-marksites-script="true"`を付け、サーバーCSPの照合対象にする。

ファイルツリーがある場合だけ`has-file-tree` classと専用スタイルを追加する。highlight無効時はhighlightテーマを埋め込まない。スクリプトの順序はファイルツリー、目次、コードブロック、コメントとする。

### `styles.ts`

- `githubMarkdownCss`: `github-markdown-css`のCSSをビルド済みモジュール読み込み時に取得する。
- `highlightCss`: highlight.jsのGitHubテーマを取得する。
- `documentStyles`: 本文と右目次、レスポンシブ目次、コードツール、基本レイアウトを定義する。
- `fileTreeStyles`: 左ファイルツリーを持つ3カラム構成とレスポンシブ表示を定義する。

CSSは生成HTMLへ直接埋め込み、CDNや実行時ファイル参照を追加しない。

## 不変条件

- 出力は完全なHTML文書で末尾改行を持つ。
- title、languageなど外部値は呼び出し側でエスケープ済みであることを前提とする。
- Markdown由来の任意scriptをtrusted scriptとしてマークしてはならない。
