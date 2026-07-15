# features仕様

## 責務

`src/features/`は、生成HTMLへ追加する機能単位のマークアップ、スタイル、ブラウザJavaScriptを所有する。ブラウザスクリプトは外部通信やCDNに依存せず、生成HTML内へ埋め込める文字列として返す。

## ファイル

### `code-blocks.ts`

- `createCodeBlocksFeature(renderer, highlight)`: markedのcode rendererを設定し、コードブロックの有無を追跡する。
- `renderCodeBlock()`: 言語ラベル、Wrap、Copy操作を含むコード領域を生成する。
- `renderCodeBlockScript()`: コピーと折り返し切り替えをイベント委譲で実装する。
- `CodeBlocksFeature.renderScript()`: コードブロックが存在する場合だけスクリプトを返す。

対応言語はhighlight.jsで強調し、未対応言語と強調無効時はHTMLエスケープしたプレーンコードを出力する。コピーはClipboard APIが使えない場合にtextareaと`execCommand("copy")`へフォールバックする。

### `file-tree.ts`

- `renderNodes()`: ディレクトリを`details`、ファイルをリンクとして再帰描画する。
- `renderFileTree(options)`: ファイルツリー、開閉ボタン、ファイル名フィルターを生成する。
- `renderFileTreeScript(enabled)`: 開閉、フィルター、Escapeによる解除、祖先ディレクトリ表示を実装する。
- `renderBreadcrumbs()`: リンク可能セグメントと現在文書からパンくずを生成する。

ファイル検索は大文字小文字を区別せずファイル名へ部分一致する。一致ファイルの祖先だけを表示し、検索解除時は初期開閉状態へ戻す。名前、href、ラベルはHTMLエスケープする。

### `table-of-contents.ts`

- `createTableOfContentsFeature(renderer, config)`: markedのheading rendererを設定し、GithubSluggerで決定的な見出しIDを生成する。
- `renderTableOfContents()`: 指定深度内の見出しを階層インデント付きリンクへ変換する。
- `renderTableOfContentsScript()`: レスポンシブ開閉とスクロール位置に応じた現在見出しの強調を実装する。

同一見出しにはGitHub互換の接尾辞を付ける。狭い画面では折り畳み、リンク選択後に閉じる。

### `annotations.ts`

- `safeJson()`: `<`、`>`、`&`をUnicode escapeし、JSON script要素からの脱出を防ぐ。
- `createAnnotationsFeature(data?)`: コメントデータ、選択操作ツールバー、コメントパネル、スタイル、ブラウザ動作を一体で返す。

ブラウザ側の主要処理:

- `selectionData()`: 本文内の選択だけを受け付け、exact、prefix、suffix、headingId、offsetを作る。
- `copy()`: 選択文字列またはAI用Markdownをコピーし、`file://`向けフォールバックを持つ。
- `locate()`: 見出し、完全一致、前後文、保存オフセットの順でコメント位置を再特定する。
- `render()`: コメント一覧と本文ハイライトを描画し、位置不明は誤配置せず表示する。
- `connect()`: HTTP時だけruntime APIを確認し、能力が一致した場合だけ編集を有効化する。
- `mutate()`: 作成・編集・削除をAPIへ送り、409時は最新状態を再取得する。

`file://`ではAPIへ接続せず閲覧専用とする。選択操作は目次、ファイルツリー、コード操作、コメントUI自身を対象外にする。コメント本文はDOMの`textContent`で表示する。

## 依存境界

- featureはファイルシステムへアクセスしない。
- 永続化、HTTPルーティング、ディレクトリ探索は扱わない。
- feature固有のCSSとスクリプトは可能な限り同じファイルで管理する。
