# utils仕様

## 責務

`src/utils/`には、複数の責務領域から利用される小さく汎用的な処理だけを置く。単一機能専用のロジックやドメイン型は置かない。

## ファイル

### `html.ts`

- `escapeHtml(value)`: `&`、`<`、`>`、`"`、`'`をHTML entityへ変換する。本文断片、属性、ラベルの安全な生成に使用する。
- `plainTextFromHtml(value)`: HTMLタグを除去し、主要なentityを復号して見出しのプレーンテキストを得る。

`plainTextFromHtml()`は一般的なHTML sanitizerではなく、markedが生成した見出しinline HTMLからslug・目次用文字列を作るための限定的なhelperである。

### `files.ts`

- `atomicWriteFile(path, content)`: 親ディレクトリを作成し、同じフォルダの一時ファイルへUTF-8で書き込んだ後、renameで置換する。
- 一時ファイル名はPIDとUUIDを含み、並行処理で衝突しない。

manifest、文書メタデータ、HTMLなど、途中状態を正本として見せたくない書き込みに使用する。書き込み失敗時に既存ファイルを先に削除してはならない。

### `icons.ts`

- `renderCopyIcon()`: コード、選択範囲、AI用テキスト、ファイルパスの各コピー操作で共有するinline SVGを返す。
- `renderAddIcon()`: コメント追加などの作成操作で共有する＋型inline SVGを返す。
- `renderWrapIcon()`: コードブロックの行折り返し操作を示すinline SVGを返す。
- `renderEditIcon()`: コメント編集操作を示す鉛筆のinline SVGを返す。
- `renderDeleteIcon()`: コメント削除操作を示すごみ箱のinline SVGを返す。
- `renderArchiveIcon()`: コメントのアーカイブ操作を示す保管箱のinline SVGを返す。
- `renderRestoreIcon()`: アーカイブ済みコメントの復元操作を示す戻る矢印のinline SVGを返す。
- `renderFolderIcon()`: ファイルツリーのディレクトリを示し、他の操作アイコンと線幅を揃えたアウトライン型フォルダのinline SVGを返す。

SVGは16px viewBox内で視覚的な中心を揃え、外部アセットへ依存せず、装飾要素として`aria-hidden`を付ける。各ボタンの用途はボタン本文または`aria-label`で示す。

## 追加基準

- 複数モジュールで共有されること。
- 名前と入出力が特定featureやserver APIへ依存しないこと。
- 副作用があるhelperは、`atomicWriteFile()`のように目的と失敗時の保証が明確であること。
