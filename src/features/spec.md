# features仕様

## 責務

`src/features/`は、生成HTMLへ追加する機能単位のマークアップ、スタイル、ブラウザJavaScriptを所有する。ブラウザスクリプトは外部通信やCDNに依存せず、生成HTML内へ埋め込める文字列として返す。

## ファイル

### `code-blocks.ts`

- `createCodeBlocksFeature(renderer, highlight)`: markedのcode rendererを設定し、コードブロックの有無を追跡する。
- `renderCodeBlock()`: 言語ラベル、Wrap、Copy操作を含むコード領域を生成する。
- `renderCodeBlockScript()`: コピーと折り返し切り替えをイベント委譲で実装する。
- `CodeBlocksFeature.renderScript()`: コードブロックが存在する場合だけスクリプトを返す。

対応言語はhighlight.jsで強調し、未対応言語と強調無効時はHTMLエスケープしたプレーンコードを出力する。コピー操作には共通のinline SVGを表示し、Clipboard APIが使えない場合にtextareaと`execCommand("copy")`へフォールバックする。

### `file-tree.ts`

- `renderNodes()`: ディレクトリをフォルダSVG付きの`details`、ファイルをリンクとして再帰描画し、1件以上のコメント件数をバッジ表示する。
- `renderFileTree(options)`: ファイルツリー、開閉ボタン、ファイル名フィルターを生成する。
- `renderFileTreeScript(enabled)`: 開閉、フィルター、Escapeによる解除、祖先ディレクトリ表示、現在ファイルパスのコピーを実装する。
- `renderBreadcrumbs()`: リンク可能セグメントと現在文書からパンくずを生成し、全セグメントを`/`で連結したパスのアイコン専用コピーボタンを付ける。

ファイル検索は大文字小文字を区別せず`data-file-name`のファイル名へ部分一致し、コメント件数は検索文字列に含めない。一致ファイルの祖先だけを表示し、検索解除時は初期開閉状態へ戻す。コメント0件のバッジは表示しない。パスコピーはClipboard APIを使用し、`file://`では一時textareaと`execCommand("copy")`へフォールバックする。名前、href、ラベル、コピー対象属性はHTMLエスケープする。

### `table-of-contents.ts`

- `createTableOfContentsFeature(renderer, config)`: markedのheading rendererを設定し、GithubSluggerで決定的な見出しIDを生成する。
- `renderTableOfContents()`: 指定深度内の見出しを階層インデント付きリンクへ変換する。
- `renderTableOfContentsScript()`: レスポンシブ開閉とスクロール位置に応じた現在見出しの強調を実装する。

同一見出しにはGitHub互換の接尾辞を付ける。見出しリンクと現在位置の追従を担当し、サイドバー全体のタブ・レスポンシブ開閉は`sidebar.ts`へ委ねる。

### `sidebar.ts`

- `createSidebarFeature()`: 目次と現在ページのコメント一覧を右サイドバーのタブとして構成し、マークアップ、スタイル、ブラウザ動作を返す。
- `activate()`: ARIA tabの選択状態と対応するtabpanelの表示を同期する。
- `setExpanded()`: 900px以下でサイドバー全体を折り畳む。

デスクトップではタブヘッダーを固定し、選択中のパネルだけを独立スクロールさせる。stickyのtopはbody上余白と同じ32px、モバイルでは12pxとし、スクロール開始時の位置補正を発生させない。初期タブは目次、目次が空ならコメントとする。左右矢印キーでタブを移動でき、コメント作成・本文ハイライト選択時の`marksites:show-comments`イベントでコメントタブを開く。

### `annotations.ts`

- `safeJson()`: `<`、`>`、`&`をUnicode escapeし、JSON script要素からの脱出を防ぐ。
- `createAnnotationsFeature(data?)`: 現在文書のコメントデータ、選択操作ツールバー、サイドバーへ渡すコメントパネル、件数、スタイル、ブラウザ動作を一体で返す。

ブラウザ側の主要処理:

- `selectionData()`: 本文内の選択だけを受け付け、exact、prefix、suffix、headingId、offsetを作る。
- `copy()`: 選択文字列またはAI用Markdownをコピーし、`file://`向けフォールバックを持つ。
- `locate()`: 見出し、完全一致、前後文、保存オフセットの順でコメント位置を再特定する。
- `render()`: コメント一覧、件数、空状態、本文ハイライトを描画し、位置不明は誤配置せず表示する。
- `updateCurrentFileCount()`: コメント作成・削除後、再読み込みを待たず現在ファイルのツリーバッジを同期する。
- `showAnnotation()`: 一覧から本文の対象箇所へ移動し、本文ハイライトからは対応カードを表示する。
- `connect()`: HTTP時だけruntime APIを確認し、能力が一致した場合だけ編集を有効化する。
- `mutate()`: 作成・編集・削除をAPIへ送り、409時は最新状態を再取得する。

一覧の先頭に文書全体へコメントする追加ボタンを置き、範囲選択コメントと同じフォーム・APIを利用する。範囲のないコメントは引用の代わりに`Document comment`と表示し、位置不明として扱わない。一覧には埋め込まれた現在ページのコメントだけを表示し、他文書のコメントは取得しない。サイドバー内ではコメント本文を13px、引用文を12px相当のコンパクトな文字サイズで表示し、引用全文をDOMに保ったままCSSで2行に制限する。コメントカードは主要パネルと同じ8px、コメント欄内の操作ボタンは追加ボタンと同じ6pxの角丸と共通配色を使用する。EditとDeleteはカード右上へ重ねる絶対配置とし、非表示時にカード内の領域を確保しない。カードのhover中、操作領域のキーボードフォーカス中だけ表示し、カードの選択状態では表示を維持しない。端末のhover media queryはタッチ対応PCや仮想環境で誤判定されるため使用せず、実際のtouch pointerでカードを選択した場合だけ操作を表示する。フォーカス中のカードと対応する本文ハイライトはアクセント背景・境界色へ変え、通常表示やhoverと区別する。`file://`では追加ボタンを無効にしてAPIへ接続せず閲覧専用とする。選択操作は目次、ファイルツリー、コード操作、コメントUI自身を対象外にする。コメント本文はDOMの`textContent`で表示する。

Edit時は共通フォームを対象カード内へ移動し、引用を対象箇所として残したまま本文・操作ボタンをフォームへ置き換えてその場で編集する。編集中は選択カードのアクセント背景と太いoutlineを解除し、通常背景、境界線、控えめなshadowでフォーム状態を示す。textareaは6pxの角丸とfocus ringを持ち、操作行は右寄せしてSaveをprimary、Cancelをsecondaryとして表示する。保存またはキャンセル後は通常のカード表示へ戻す。EditとDeleteは文字ラベルを持たない28pxのアイコン操作として一体型ツールバーへまとめ、用途は`aria-label`と`title`で示す。削除操作はhover時だけdanger色で区別する。

## 依存境界

- featureはファイルシステムへアクセスしない。
- 永続化、HTTPルーティング、ディレクトリ探索は扱わない。
- feature固有のCSSとスクリプトは可能な限り同じファイルで管理する。
