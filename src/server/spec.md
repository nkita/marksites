# server仕様

## 責務

`src/server/`は任意のローカルHTTPサービスを所有する。生成フォルダの静的配信、runtime情報、コメントCRUD、インポート・エクスポート、同一オリジン保護を提供する。ファイル監視、ポーリング、常駐文書キャッシュは行わない。

## ファイル

### `constants.ts`

- `MARKSITES_API_BASE_PATH`: `/_marksites/api/v1`。
- `MARKSITES_RESERVED_PATH`: 出力ルートで予約する`_marksites`。

### `types.ts`

- `MarksitesServerOptions`: 出力ルート、エントリーHTML、host、port、project情報、文書とメタデータの対応、更新コールバックを定義する。
- `RunningServer`: 実URLと非同期`close()`を公開する内部型。

### `response.ts`

- `sendJson()`: 成功を`{ data }`、失敗を`{ error: { code, message } }`へ統一する。APIレスポンスへ`no-store`、nosniff、no-referrerを付与する。

### `html-security.ts`

- `generatedScriptBodies()`: marksitesが生成する既知のブラウザスクリプト本文を構築する。
- `secureHtml()`: レスポンスごとにnonceを生成し、既知本文かつmarksitesマーカー付きスクリプトだけへnonceを付ける。

CSPは未知のinline script、object、base、frame埋め込みを拒否し、接続先を同一オリジンへ限定する。静的HTMLファイル自体は変更せず、HTTPレスポンス時だけnonceを付ける。

### `static-files.ts`

- `handleStaticFile()`: GET・HEAD、index解決、entryPath fallback、Content-Type、404・405を処理する。
- URL decode後の`..`、バックスラッシュ、NUL、出力ルート外パスを拒否する。
- symlinkのrealpathが出力ルート外なら配信しない。
- HTMLは`secureHtml()`を通し、それ以外はストリーム配信する。

### `api.ts`

- `readBody()`: JSON本文を読み、128KiBを超える要求を413にする。
- `safeDocument()`: 絶対パス、backslash、`..`を含む文書指定を拒否する。
- `handleApi()`: HTTP methodとパスを小さなルーターとして振り分ける。

API:

- `GET /health`
- `GET /runtime`
- `GET /project`
- `GET /annotations?document=...`
- `POST /annotations`
- `PATCH /annotations/:id`
- `DELETE /annotations/:id`
- `GET /annotations/export`
- `POST /annotations/import`

Originがある場合はサーバー自身のoriginだけを許可する。更新APIは`application/json`だけを受け付ける。

### `annotation-repository.ts`

- `path()`: manifest由来の許可済み文書だけをメタデータパスへ解決し、出力ルート外を拒否する。
- `get()`、`exportProject()`、`importProject()`: 文書またはプロジェクト単位で読み書きする。
- `locked()`: 文書単位のPromise queueで並行更新を直列化する。
- `checkRevision()`: baseRevision不一致を409にする。
- `create()`、`update()`、`delete()`: revisionを単調増加させ、アトミック保存後にHTML再生成callbackを実行する。
- `validateLimits()`: コメント本文10,000文字、選択文字20,000文字、前後文各500文字、文書当たり5,000件を上限とする。

作成IDと日時はサーバー側で決定する。JSON保存後のHTML再生成に失敗してもJSONを正本として維持する。

### `server.ts`

- `assertReservedPathIsAvailable()`: 物理`_marksites`が存在する場合は起動を拒否する。
- `startMarksitesServer()`: repositoryとHTTP serverを組み立て、Host検証、API・静的配信の分岐、listen、closeを管理する。

デフォルトhostは`127.0.0.1`、デフォルトportは3000である。port 0はテストと自動割り当てに利用できる。
