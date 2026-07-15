# conversion仕様

## 責務

`src/conversion/`は、単一MarkdownおよびMarkdown集合をHTMLへ変換するための内部ドメインである。探索、パス規則、`.gitignore`、ナビゲーション、ハッシュ、差分管理、実行を所有する。

## ファイル

### `types.ts`

- `MarkdownFile`: 入力絶対パス、Markdown相対パス、HTML相対パス、メタデータ相対パス、ビルド中の本文・ハッシュを保持する。
- `ManifestFile`: 前回成功時のsourceHash、annotationHash、HTML・メタデータパスを保持する。
- `BuildManifest`: schema version、生成互換情報、treeHash、文書別状態を表す。
- `ConversionResult`: CLI表示に必要な変換・スキップ・削除・作成・移動件数を返す。

### `paths.ts`

- `DEFAULT_OUTPUT_DIRECTORY`: 出力未指定時の`marksites`。
- `isMarkdown()`: `.md`と`.markdown`を大文字小文字を区別せず判定する。
- `toHtmlPath()`: Markdown拡張子を`.html`へ変換する。
- `toMetadataPath()`: `guide/start.md`を`guide/.start.json`へ対応付ける。
- `toLegacyMetadataPaths()`: 旧`.marksites.json`と`.annotations.json`の候補を返す。
- `pathExists()`、`firstExistingPath()`: 既存ファイル確認を共通化する。
- `findMarkdownFiles()`: 決定的な順番で再帰探索し、`MarkdownFile`を作る。

探索では`.git`、`node_modules`、`dist`、`coverage`、現在の出力先を除外する。`.marksites-build.json`を持つ子フォルダも生成物として除外する。

### `gitignore.ts`

- `loadGitignoreRules()`: 各ディレクトリの`.gitignore`を読み、親ルールへ追加する。
- `isGitignored()`: 対象パスを各`.gitignore`の基準ディレクトリへ変換し、後続ルールと否定パターンを含めて判定する。
- `scopePath()`: 入力ルート相対パスをネストした`.gitignore`基準へ変換する。

判定には`ignore`パッケージを使用する。無視されたディレクトリは再帰しない。ネストした`.gitignore`と`!`による再包含をサポートする。

### `navigation.ts`

- `buildFileTree()`: 全Markdownをディレクトリ木へ変換し、現在ページ基準のURLを生成する。
- `buildBreadcrumbs()`: ルートから現在文書までのパンくずを作る。各階層に`index.md`または`index.markdown`がある場合だけリンクする。

URLの各パスセグメントは`encodeURIComponent()`で符号化する。並び順はディレクトリ優先、次に英語localeによる名前順とする。

### `rendering.ts`

- `contentHash()`: `sha256:<hex>`形式のSHA-256を返す。
- `rewriteMarkdownLinks()`: 相対`.md`・`.markdown`リンクだけを`.html`へ変換する。
- `renderFingerprint()`: 全機能を含む代表HTMLと出力互換バージョンからレンダー指紋を作る。
- `OUTPUT_COMPATIBILITY_VERSION`: 生成互換性を明示的に変更する場合のバージョン。

絶対URL、プロトコル相対URL、ルート相対URLはリンク書き換え対象外である。

### `manifest.ts`

- `BUILD_MANIFEST`: `.marksites-build.json`。
- `assertNoOutputCollisions()`: HTML・メタデータ・予約パスの衝突を拒否する。
- `loadManifest()`: 未存在は初回ビルド、不正または未対応形式は警告付き全体再変換として扱う。
- `writeManifest()`: 全処理成功後にアトミック置換する。

### `single-file.ts`

- `convertFile()`: 単一Markdownを毎回変換する。出力未指定時は`./marksites/<basename>.html`を使用する。
- 旧メタデータ名があり新形式がない場合は、新しい`.<basename>.json`へ移動する。
- 既存メタデータを読み込み、コメントスナップショットをHTMLへ埋め込む。

### `directory.ts`

- `migrateLegacyMetadata()`: 既存データを上書きせず旧名から移行する。
- `loadSources()`: 全Markdown本文とsourceHashを読み込む。
- `moveRenamedDocuments()`: sourceHashが一意に一致する削除・追加だけをリネームと判断し、HTMLとメタデータを移動する。
- `warnAboutStaleLinks()`: リネーム前パスを含む可能性のあるリンクを警告する。
- `loadMetadata()`: メタデータの作成・検証とannotationHash計算を行う。
- `removeDeletedHtml()`: 削除Markdownの旧HTMLだけを削除し、メタデータは孤立データとして保持する。
- `renderChangedFiles()`: 計画上必要なHTMLだけをアトミックに書き込む。
- `convertDirectoryDetailed()`: 探索からmanifest確定までを順番に組み立てる。
- `convertDirectory()`: 互換用に変換件数だけを返す。

treeHashまたはrenderFingerprintが変わった場合は全HTMLを再生成する。本文・メタデータだけが変わった場合は対象HTMLだけを生成する。manifestは全変換成功後にだけ更新する。
