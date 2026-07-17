# template仕様

## 責務

`src/template/`は、スタンドアロンHTML文書の外枠と共通埋め込みCSSを所有する。Markdown解析、ファイル探索、HTTP配信は扱わない。

## ファイル

### `document.ts`

- `DocumentParts`: 事前に組み立てられたtitle、language、本文、パンくず、ファイルツリー、右サイドバー、コメント補助UI、各スタイルとスクリプトを受け取る内部型。
- `renderDocument(parts)`: doctypeからbody末尾までの単一HTML文字列を生成する。
- `trustedScript()`: marksites自身の実行スクリプトへ`data-marksites-script="true"`を付け、サーバーCSPの照合対象にする。

ファイルツリーがある場合だけ`has-file-tree` classと専用スタイルを追加する。900px以下ではファイルツリーと文書サイドバーの折り畳みヘッダーを同じ44pxに揃え、展開時の最大高さは上下余白を除くviewport高とする。highlight無効時はhighlightテーマを埋め込まない。スクリプトの順序はファイルツリー、サイドバー、目次、コードブロック、コメントとする。

### `styles.ts`

- `githubMarkdownCss`: `github-markdown-css`のCSSをビルド済みモジュール読み込み時に取得する。
- `highlightCss`: highlight.jsのGitHubテーマを取得する。
- `documentStyles`: 本文と右サイドバーのグリッド、目次パネル、コードツール、基本レイアウトを定義する。下余白はbodyのpaddingではなく本文のgrid marginとして確保し、ページ末尾でもstickyサイドバーが親グリッド下端に押し上げられないようにする。目次の内側へ`min-height: 100%`を指定せず、外側パネルのpaddingによる不要なオーバーフローを防ぐ。タブとコメント固有のスタイルは各featureが所有する。
- `fileTreeStyles`: 左ファイルツリーを持つ3カラム構成、パンくずのパスコピーボタン、コメント件数バッジ、レスポンシブ表示を定義する。ファイルツリーのsticky topはbody上余白と同じ32pxに揃え、内部の上下余白はコンパクトに保つ。GitHub本文CSSが`details`へ付ける16pxの下余白は、ツリー内に限って0へリセットする。

CSSは生成HTMLへ直接埋め込み、CDNや実行時ファイル参照を追加しない。

## 不変条件

- 出力は完全なHTML文書で末尾改行を持つ。
- title、languageなど外部値は呼び出し側でエスケープ済みであることを前提とする。
- Markdown由来の任意scriptをtrusted scriptとしてマークしてはならない。
