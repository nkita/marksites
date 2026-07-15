# annotations仕様

## 責務

`src/annotations/`は、文書メタデータJSONのうち現在実装されているコメントデータの型、検証、直列化、永続化を所有する。HTTP、HTML生成、パス探索は扱わない。

正本はHTMLに隣接する`.<HTML basename>.json`である。再変換時に既存ファイルを空データで上書きしてはならない。

## ファイル

### `model.ts`

- `AnnotationSelection`: 選択文字列の再特定情報。`exact`、前後文、見出しID、開始・終了オフセットを保持する。
- `Annotation`: ID、選択位置、コメント本文・作者、状態、作成・更新日時を表す。
- `AnnotationDocument`: `schemaVersion: 1`、Markdown相対パス、revision、コメント配列からなる正本形式。
- `emptyAnnotationDocument(document)`: revision 0、空配列の初期データを生成する。
- `validateAnnotationDocument(value, expectedDocument?)`: 文書全体と各コメントを検証し、必要なら文書パスの一致も要求する。
- `validateAnnotation(value)`: コメントの必須フィールド、状態、オフセット、日時を検証する。

オフセットは0以上で、`endOffset >= startOffset`でなければならない。日時は`Date.parse()`可能でなければならない。

### `storage.ts`

- `serializeAnnotations(value)`: 2スペースインデントと末尾改行を持つ決定的なJSONへ変換する。
- `readAnnotations(path, document?)`: 既存JSONを読み込んで検証する。ファイルがなく`document`が指定された場合だけ空データをアトミックに作成する。
- `writeAnnotations(path, value)`: 検証後にアトミック置換する。

不正JSONは空データへ置換せず、対象パスを含むエラーにする。通常の読み込みでは既存JSONのrevisionとコメントを変更しない。

## 依存境界

- `model.ts`はファイルシステムへアクセスしない。
- `storage.ts`は`src/utils/files.ts`のアトミック書き込みだけを利用する。
- API固有のHTTPステータスや画面表示はこのフォルダへ持ち込まない。
