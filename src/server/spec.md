# server仕様

## 責務

`src/server/`は任意のローカルHTTPサービスを所有する。生成フォルダの静的配信、runtime情報、コメントCRUD、インポート・エクスポート、同一オリジン保護を提供する。ファイル監視、ポーリング、常駐文書キャッシュは行わない。

## ファイル

### `constants.ts`

- `MARKSITES_API_BASE_PATH`: `/_marksites/api/v1`。
- `MARKSITES_RESERVED_PATH`: 出力ルートで予約する`_marksites`。

### `types.ts`

- `MarksitesServerOptions`: 出力ルート、エントリーHTML、host、port、ポートフォールバック、project情報、文書とメタデータの対応、更新コールバックを定義する。
- `RunningServer`: 実URLと非同期`close()`を公開する内部型。

### `response.ts`

- `sendJson()`: 成功を`{ data }`、失敗を`{ error: { code, message } }`へ統一する。APIレスポンスへ`no-store`、nosniff、no-referrerを付与する。

### `html-security.ts`

- `secureHtml()`: レスポンスごとにnonceを生成し、Featureレジストリの既知本文かつmarksitesマーカー付きスクリプトだけへnonceを付ける。

CSPは未知のinline script、object、base、frame埋め込みを拒否し、接続先を同一オリジンへ限定する。静的HTMLファイル自体は変更せず、HTTPレスポンス時だけnonceを付ける。
既知本文には画像ビューアーを含む全featureの埋め込みスクリプトを登録する。

### `static-files.ts`

- `handleStaticFile()`: GET・HEAD、index解決、entryPath fallback、Content-Type、404・405を処理する。ブラウザによる`/favicon.ico`の自動要求には204を返す。
- URL decode後の`..`、バックスラッシュ、NUL、出力ルート外パスを拒否する。
- symlinkのrealpathが出力ルート外なら配信しない。
- HTMLは`secureHtml()`を通し、それ以外はストリーム配信する。

### `api.ts`

- `handleApi()`: HTTP methodとパスを小さなルーターとして振り分ける。

### `request.ts`

- `readJsonBody()`: JSON本文を読み、128KiBを超える要求を413にする。
- `validateDocumentPath()`: 絶対パス、backslash、`..`を含む文書指定を拒否する。

### `errors.ts`

- `httpError()`: APIで扱うHTTP status付きエラーを生成する。

### `keyed-lock.ts`

- `KeyedLock.run()`: 文書キー単位のPromise queueで並行更新を直列化する。

### `annotation-validation.ts`

- revision競合とコメント本文・選択範囲・件数の上限を検証する。

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
- `locked()`: `KeyedLock`へ文書単位の直列化を委譲する。
- `create()`、`update()`、`delete()`: revisionを単調増加させ、アトミック保存後にHTML再生成callbackを実行する。削除はコメントをJSONから除外する。
- 入力上限とrevision検証は`annotation-validation.ts`へ委譲する。

作成IDと日時はサーバー側で決定する。JSON保存後のHTML再生成に失敗してもJSONを正本として維持する。

### `server.ts`

- `assertReservedPathIsAvailable()`: 物理`_marksites`が存在する場合は起動を拒否する。
- `startMarksitesServer()`: repositoryとHTTP serverを組み立て、Host検証、API・静的配信の分岐、listen、closeを管理する。

デフォルトhostは`127.0.0.1`、デフォルトportは3000である。ポート未指定時に`EADDRINUSE`が発生した場合は、3001以降を昇順に探索する。明示されたportはフォールバックせず、競合をエラーとして報告する。port 0はテストとOSによる自動割り当てに利用できる。
