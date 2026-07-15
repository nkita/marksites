# ローカルサーバー・コメント機能 設計素案

## 文書の位置づけ

この文書は、`marksites` に任意のローカルサーバーとコメント機能を追加するための設計素案である。実装前に段階的に内容を見直し、合意した仕様から順番に確定する。

現在の `marksites` が持つ次の性質は維持する。

- 通常のMarkdown変換にサーバーを必要としない。
- 生成HTMLは単体で成立し、`file://` から閲覧できる。
- ローカルサーバーは、コメントの共有とJSONへの永続化が必要な場合だけ起動する任意機能とする。
- 既存の `markdownToHtml()` 公開APIと既存CLIの挙動は、無関係な変更で壊さない。

## 目標

生成HTML上で選択した文字列に対して、次の操作を提供する。

1. 選択文字列をコピーする。
2. 選択文字列と対象Markdownの相対パスを、AIへ渡しやすい形式でコピーする。
3. 選択文字列へコメントを追加・編集・削除する。
4. コメントJSONを唯一の正本とし、ローカルサーバー起動中だけ追加・編集・削除を許可する。
5. 静的HTMLにもビルド時点のコメントを埋め込み、`file://` では閲覧専用で表示する。

## 全体構成

```text
Markdown
   |
   | marksitesによる差分変換
   v
出力フォルダ
   |- HTML
   |- HTMLと同じ階層のコメントJSON
   `- 出力ルートのビルド管理ファイル

Browser
   |- 静的モード: コメント表示のみ
   `- サーバーモード: 表示と編集
                  |
                  v
       コメントJSONを安全に更新
```

静的変換とサーバーモードは次のように分離する。

```text
marksites <input> [output]
    `- 静的HTMLとコメントJSONを出力

marksites serve <input> [output]
    |- 必要なMarkdownだけ差分変換
    |- 生成物をHTTP配信
    `- コメントAPIを提供
```

CLIの入力を省略した場合はカレントディレクトリ、出力を省略した場合はカレントディレクトリ直下の`marksites/`として扱う。したがって`marksites`は`marksites . marksites`、`marksites serve`は`marksites serve . marksites`と同じである。プロジェクトルートの探索では`.git`、`node_modules`、`dist`、`coverage`を標準で除外する。

Markdown探索では、入力ルートから各階層の`.gitignore`を読み込み、Git互換のパターン、ディレクトリ指定、否定パターンを適用する。現在の出力先は絶対パスで除外し、`.marksites-build.json`が存在する過去の生成フォルダも再帰探索しない。これにより、生成物の再入力と依存パッケージ内Markdownの誤変換を防ぐ。

### 実装モジュール構成

内部実装は次の責務で分離する。

```text
src/
|- annotations/        コメントを含む文書メタデータの型・検証・保存
|- conversion/         Markdown探索、パス規則、ナビゲーション、差分管理、変換実行
|- features/           生成HTMLへ組み込む機能単位のマークアップ・CSS・スクリプト
|- server/             API、静的配信、HTMLセキュリティ、サーバーライフサイクル
|- template/           単体HTMLの文書シェルと共通スタイル
|- cli.ts              引数解析、起動、結果表示
`- markdown-to-html.ts 単一文書レンダリングの組み立て
```

`src/cli/directory.ts`は既存の内部利用との互換性を保つ薄いファサードとし、変換処理そのものは持たない。サーバーからの再変換もCLI層ではなく`src/conversion/`の処理を使用する。内部モジュールはpackageの`exports`へ追加しない。

コマンド名と引数は、実装前に現在のCLIとの互換性を確認して最終決定する。

## 出力フォルダ

### ファイル配置

コメントJSONは、対応するHTMLと同じフォルダへ配置する。MarkdownとHTMLの相対階層はこれまでどおり維持する。

```text
docs/
|- index.md
`- guide/
   `- getting-started.md

docs-html/
|- .marksites-build.json
|- index.html
|- .index.json
`- guide/
   |- getting-started.html
   `- .getting-started.json
```

対応関係は次のとおりとする。

| Markdown         | HTML               | コメントJSON        |
| ---------------- | ------------------ | ------------------- |
| `index.md`       | `index.html`       | `.index.json`       |
| `guide/start.md` | `guide/start.html` | `guide/.start.json` |
| `api.markdown`   | `api.html`         | `.api.json`         |

`.md` と `.markdown` が同じ出力名へ衝突する場合は、現在のHTML変換と同様にエラーとする。

旧版の`.<HTML basename>.marksites.json`または`<HTML basename>.annotations.json`が存在し、新しいドットファイルがまだ存在しない場合は、変換時に`.<HTML basename>.json`へ自動移動する。複数の候補が存在する場合は新しいファイルを正本とし、旧ファイルを暗黙に上書きまたは削除しない。

### 静的変換時のJSON

ローカルサーバーを使用しない静的変換でも、各HTMLに対応するコメントJSONを出力する。

- JSONが存在しない場合は、空のコメントJSONを作成する。
- JSONが既に存在する場合は、既存内容を維持する。
- Markdownの再変換を理由に、既存コメントを空データで上書きしない。
- JSON内のコメントをHTMLへ安全に埋め込み、静的表示でも閲覧できるようにする。
- 静的表示ではコメントの追加・編集・削除操作を無効化する。選択文字列のコピーとAI用コピーは引き続き利用できる。
- Markdownを削除した場合も、初期仕様では対応JSONを自動削除しない。コメントを含む可能性があるため、孤立ファイルとして報告する。
- 明示的な整理コマンドを将来提供する場合も、確認なしでコメントJSONを削除しない。

空ファイルの形式は次のようにする。

```json
{
  "schemaVersion": 1,
  "document": "guide/getting-started.md",
  "revision": 0,
  "annotations": []
}
```

### 出力フォルダ削除時の注意

コメントJSONをHTMLと同じ出力フォルダだけに保存する場合、利用者が出力フォルダを手動で削除するとコメントも失われる。

初期方針は次のとおりとする。

- 通常の再ビルドでは出力フォルダを全削除しない。
- `--clean` 相当の処理を追加する場合、コメントJSONを一時退避してから生成後に復元する。
- JSONのエクスポートとインポートを提供する。

出力フォルダを削除しても復元可能にする別の正本保存先が必要かは、今後の検討事項とする。

## コメントJSON

```json
{
  "schemaVersion": 1,
  "document": "guide/getting-started.md",
  "revision": 4,
  "annotations": [
    {
      "id": "019b1234-5678-7abc-9def-0123456789ab",
      "selection": {
        "exact": "選択した文字列",
        "prefix": "選択範囲の直前",
        "suffix": "選択範囲の直後",
        "headingId": "installation",
        "startOffset": 12,
        "endOffset": 20
      },
      "comment": {
        "body": "この部分を詳しく説明してほしい。",
        "author": null
      },
      "status": "open",
      "createdAt": "2026-07-15T10:00:00+09:00",
      "updatedAt": "2026-07-15T10:00:00+09:00"
    }
  ]
}
```

選択位置は単一のDOMパスだけに依存させない。見出しID、選択文字列、前後の文字列、見出し内オフセットを組み合わせて再特定する。

再特定は見出しIDで探索範囲を狭め、`exact`の完全一致、`prefix`と`suffix`が一致する候補、保存オフセットに近い候補の順で決定する。対象が見つからない場合や、別コメントのハイライトとDOM範囲が重なって安全にマークできない場合は、誤った本文を強調せず、コメント一覧へ「Location unavailable」と表示する。重なったコメント本文自体はすべて一覧で閲覧できる。

`revision` は、古いブラウザ状態によるJSONの上書きを防ぐために使用する。

## コメントの表示・編集モード

IndexedDBは使用せず、コメントJSONを唯一の正本とする。

変換時に対応JSONを読み込み、コメント本文と選択位置をHTMLへ安全に埋め込む。したがって、静的HTMLを `file://` で開いた場合も、ビルド時点のコメントを表示できる。

```text
静的モード
|- コメントを表示できる
|- 選択文字列をコピーできる
|- AI用コピーを利用できる
`- コメントの追加・編集・削除はdisabled

サーバーモード
|- コメントを表示できる
|- コメントの追加・編集・削除が有効
`- 更新結果をJSONへ即時保存
```

ページ起動時に、まず `location.protocol` を確認する。`file:` の場合はAPIを呼び出さず、閲覧専用のままとする。HTTPで表示されている場合だけ `GET /_marksites/api/v1/runtime` を呼び出し、marksitesローカルサーバーから有効な応答が返った場合に限って編集操作を有効化する。判定中も編集操作は無効にして、サーバー誤検出による編集内容の消失を防ぐ。

サーバーモードでは起動後に最新コメントJSONを取得し、HTMLへ埋め込まれたスナップショットより新しい場合は画面表示を更新する。ブラウザ内に未保存の状態は長時間保持せず、API保存が成功した時点で編集完了とする。保存に失敗した場合は入力内容を画面に残して再試行できるようにする。

初期版では別タブへ更新をプッシュ配信しない。古いrevisionで保存した場合は`409 Conflict`を受けて最新JSONを再取得し、入力内容を保持したまま再確認を促す。

`serve --open`はWindowsでは`cmd.exe`、macOSでは`open`、Linuxでは`xdg-open`を使用する。WSLではWindows側の`cmd.exe`を優先する。起動コマンドが存在しない場合は警告とURLを表示するだけに留め、起動済みサーバーを終了させない。

ルートURL `/` は出力先の`index.html`へ解決する。`index.html`が存在しない場合は、変換対象HTMLの相対パスを決定的にソートした先頭ページをエントリーページとして使用する。

## 差分変換

### 基本方針

変換コマンドは毎回すべてのHTMLを再生成せず、前回の変換から影響があったファイルだけを再生成する。

出力フォルダ直下に管理ファイルを置く。

```text
docs-html/.marksites-build.json
```

管理ファイルは生成物であり、利用者が直接編集することは想定しない。

### 管理ファイル案

```json
{
  "schemaVersion": 1,
  "generator": {
    "name": "marksites",
    "version": "1.0.0",
    "renderFingerprint": "sha256:..."
  },
  "treeHash": "sha256:...",
  "files": {
    "index.md": {
      "sourceHash": "sha256:...",
      "annotationHash": "sha256:...",
      "output": "index.html",
      "annotations": ".index.json"
    },
    "guide/getting-started.md": {
      "sourceHash": "sha256:...",
      "annotationHash": "sha256:...",
      "output": "guide/getting-started.html",
      "annotations": "guide/.getting-started.json"
  }
}
```

`renderFingerprint` には、少なくとも次の情報を反映する。

- marksitesのバージョン
- HTMLテンプレートのバージョン
- 埋め込みCSSとブラウザスクリプトのバージョン
- 変換結果へ影響するオプション
- Markdown変換設定

実装では、目次、コードブロック、ファイルツリー、パンくず、コメントを含む決定的な代表Markdownを実際にHTMLへ変換し、そのHTML全体と出力互換バージョンからSHA-256を計算する。これにより、テンプレート、埋め込みCSS、ブラウザJavaScriptの変更時に手動のバージョン更新を忘れても全ページを再生成できる。

### 更新判定

正確性を優先し、Markdown本文のSHA-256を前回値と比較する。全Markdownを読み取ってハッシュを計算しても、HTML変換とシンタックスハイライトを全件実行するより負荷は小さい。

将来、大規模ドキュメント向けに次の高速判定を追加できる。

```text
サイズとmtimeが同じ
    `- 前回ハッシュを採用

サイズまたはmtimeが異なる
    `- SHA-256を再計算
```

ただし、mtimeだけを更新判定の正本にはしない。

### 再変換条件

| 変更内容                                    | 再変換対象                                     |
| ------------------------------------------- | ---------------------------------------------- |
| Markdown本文の変更                          | 対象HTMLのみ                                   |
| 対応HTMLが存在しない                        | 対象HTMLのみ                                   |
| 対応JSONが存在しない                        | 空JSONのみ作成。HTMLは必要時のみ               |
| コメントJSONの変更                          | 対応HTMLのみ。静的HTMLへ最新コメントを埋め込む |
| Markdownの追加・削除・移動                  | 原則として全HTML                               |
| ファイルツリー構成の変更                    | 全HTML                                         |
| 変換オプションの変更                        | 全HTML                                         |
| テンプレート、CSS、ブラウザスクリプトの変更 | 全HTML                                         |
| marksites更新で出力互換性が変わった         | 全HTML                                         |
| 管理ファイルがない、壊れている              | 安全のため全HTML                               |

Markdownの追加・削除・移動で全HTMLを更新する理由は、現在のファイルツリーが各HTMLへ埋め込まれているためである。本文だけの更新ではツリー構造が変わらないため、対象HTMLだけを変換できる。

将来、ファイルツリーを共有データへ分離すれば追加・削除時の全HTML更新を避けられるが、HTML単体での `file://` 動作と競合するため、現時点では採用しない。

### 削除されたMarkdown

Markdownが削除された場合は次のように扱う。

- 対応HTMLは古いページを残さないよう削除候補とする。
- 対応するコメントJSONは自動削除しない。
- ビルド結果で孤立コメントJSONのパスを報告する。
- HTMLを自動削除するか確認対象にするかは、CLIの既存方針を確認して確定する。

### Markdownのファイル名変更・移動

管理ファイルはMarkdownの相対パスをキーにするため、単純な比較ではファイル名変更やフォルダ移動は「旧パスの削除」と「新パスの追加」として検出される。

旧パスと新パスの `sourceHash` が同一で、その組み合わせが一意に決まる場合は、内容を変更せずにファイル名だけを変更したと判断する。

```text
前回: guide/start.md      sha256:abc
今回: guide/getting.md    sha256:abc
                           |
                           `- 一意に一致するためリネームと判定
```

リネームと判定できた場合は次の処理を行う。

1. 旧HTMLを削除する。
2. 旧コメントJSONが存在する場合は、新HTMLと同じフォルダ・名前へ移動する。
3. コメントJSON内の `document` を新しいMarkdown相対パスへ更新する。
4. 新しいパスへHTMLを生成し、移動したコメントを埋め込む。
5. 管理ファイルを新しいパスへ更新する。
6. ファイルツリーとパンくずが変わるため、ほかのHTMLも再生成する。

例は次のとおりである。

```text
変更前:
guide/start.md
guide/start.html
guide/.start.json

変更後:
guide/getting.md
guide/getting.html
guide/.getting.json
```

同じ内容のMarkdownが複数存在する場合は、ハッシュだけではどのファイルを移動したか一意に判断できない。また、ファイル名変更と本文編集を同時に行った場合も、完全一致ハッシュではリネームを判定できない。

その場合は安全のため次のように扱う。

- 新しいMarkdownを新規ファイルとして変換する。
- 旧コメントJSONは削除せず、孤立ファイルとして保持する。
- 自動的にコメントを新ファイルへ関連付けない。
- リネームを判定できなかったことと、旧コメントJSONの場所をビルド結果に表示する。

類似度による曖昧なリネーム推測は、コメントを誤った文書へ移動する危険があるため初期版では行わない。将来必要になった場合は、明示的な移行コマンドまたは文書固有IDを検討する。

Markdown内の相対リンクはファイル名変更に合わせて自動修正しない。旧パスを参照しているリンクがある場合はリンク切れになるため、可能であればビルド時の警告対象とする。

### 管理ファイルの更新

管理ファイルも一時ファイルへ書き込み、最後にアトミックに置き換える。変換途中で失敗した場合は、前回成功時の管理ファイルを維持する。

```text
.marksites-build.json.tmpへ書き込み
    |
すべての変換に成功
    |
.marksites-build.jsonへ置換
```

## ローカルサーバー

### 責務

- 生成HTMLと静的ファイルの配信
- コメントJSONの取得
- コメントの追加・編集・削除
- JSONの入力検証
- JSONのアトミック保存
- revisionによる競合検知
- プロジェクト外へのアクセス防止

サーバーはHTMLやJSONを全件メモリへ保持しない。要求されたファイルだけを読み込み、処理後に解放する。

### API案

#### 内部URL名前空間

内部URL名前空間は `/_marksites/`、APIのベースパスは `/_marksites/api/v1` とする。

```text
/_marksites/
|- api/
|  `- v1/
|     |- runtime
|     |- project
|     `- annotations
`- 将来のAPI以外の内部機能
```

ファイルシステム上では `.marksites-build.json` のようにドット始まりを使い、HTTP上では `/_marksites/` のように一重のアンダースコアを使う。媒体ごとの慣習を優先し、両者が完全に同じ表記であることは求めない。

`api` と `v1` を分けることで、将来API以外の内部リソースを置く場合や、互換性を壊すAPI変更にも対応できる。Next.jsやViteなどへ組み込む場合に備え、内部実装ではベースパスを定数に集約し、必要になった時点で設定可能にする。

```typescript
const MARKSITES_API_BASE_PATH = "/_marksites/api/v1";
```

#### エンドポイント

```text
GET    /_marksites/api/v1/runtime
GET    /_marksites/api/v1/project
GET    /_marksites/api/v1/annotations?document=guide/start.md
POST   /_marksites/api/v1/annotations
PATCH  /_marksites/api/v1/annotations/:id
DELETE /_marksites/api/v1/annotations/:id
GET    /_marksites/api/v1/health
```

`/_marksites/` は実ファイルのパスではなく、marksitesが予約する内部URL名前空間とする。

入力ドキュメントの最上位に `_marksites` が存在し、同じURLへ出力される場合は、曖昧に配信せずビルドまたはサーバー起動時に予約パスの衝突としてエラーにする。

サーバーは受信したURLを最初に判定する。

```text
/_marksites/api/*
    `- APIルーターで処理し、JSONを返す

それ以外
    `- 出力フォルダ内のHTMLや静的ファイルを返す
```

ブラウザ側は標準の `fetch()` で同一オリジンへリクエストする。

```javascript
const response = await fetch("/_marksites/api/v1/runtime", {
  headers: {
    Accept: "application/json",
  },
});

const runtime = await response.json();

if (runtime.editable === true) {
  enableCommentEditing();
}
```

ランタイム判定の応答例は次のとおりとする。

```json
{
  "service": "marksites",
  "apiVersion": 1,
  "editable": true,
  "projectId": "24c92e1c-11be-4f65-863f-c5166e5b796b"
}
```

APIはNode.js標準の `node:http` 上に小さなルーターを実装する想定であり、RESTフレームワークや別プロセスは必須としない。`v1` は将来JSON形式や更新方法を変更する際に互換性を判断するためのAPIバージョンである。

実装上は、Node.jsが受け取った `request.url` を標準の `URL` で解析し、HTTPメソッドとパスの組み合わせで処理を振り分ける。

```typescript
const url = new URL(request.url ?? "/", serverOrigin);

if (request.method === "GET" && url.pathname === "/_marksites/api/v1/runtime") {
  return handleRuntime(request, response);
}

if (
  request.method === "GET" &&
  url.pathname === "/_marksites/api/v1/annotations"
) {
  return handleGetAnnotations(request, response, url);
}

if (url.pathname.startsWith("/_marksites/api/")) {
  return respondNotFound(response);
}

return serveStaticFile(request, response, outputDirectory);
```

これはファイルシステム上に `_marksites/api/v1` フォルダを作る方式ではない。サーバーのリクエスト処理内だけに存在する仮想的なURLである。

コメント更新APIがJSON保存に成功した後、対象HTMLも再生成して最新コメントを埋め込む。これにより、サーバー停止後に同じHTMLを `file://` で開いても最新コメントを閲覧できる。HTML再生成に失敗した場合、JSONを正本としてエラーを通知し、次回の差分変換で `annotationHash` の不一致から対象HTMLを再生成する。

更新リクエストは現在の `revision` を含める。サーバー上のrevisionと一致しない場合は `409 Conflict` を返し、意図しない上書きを防ぐ。

### リソース方針

- Node.js標準の `node:http` を優先する。
- データベースを導入しない。
- WebSocketを必須にしない。
- デフォルトではファイル監視を行わない。
- 定期ポーリングを行わない。
- `127.0.0.1` のみで待ち受ける。

目標値は、アイドル時メモリ20〜50MB、アイドル時CPUほぼ0%とする。

### OSのソケットアクティベーション

OSのソケットアクティベーションは、marksitesのNode.jsプロセスではなく、OSのサービス管理機構が待ち受けポートを保持する仕組みである。

```text
通常のサーバー
Node.jsがポートを待ち受ける
    `- 利用していない間もNode.jsプロセスが常駐

ソケットアクティベーション
OSがポートを待ち受ける
    |- リクエストがない間はmarksitesプロセスなし
    `- 接続時にmarksitesを起動して、待ち受けソケットを引き渡す
```

これは、以前検討した「ローカルHTMLから要求があった時だけ、Lambdaのようにサーバーを一時起動したい」という要望を実現する候補である。HTMLやブラウザが直接ローカルプロセスを起動するのではなく、事前登録されたOSのサービス管理機構が起動を担当する。

代表的な実現手段は次のとおりである。

| OS      | 実現手段                                      |
| ------- | --------------------------------------------- |
| Linux   | systemd socket activation                     |
| macOS   | launchdのSocket設定                           |
| Windows | Windows ServiceやHTTP.sysなどを使った個別実装 |

利点は、marksites停止中の専用メモリを0MBに近づけられることである。一方で、OSごとのインストール・アンインストール処理、権限、設定ファイル、起動失敗時の診断が必要になり、クロスプラットフォーム実装のコストが大きい。

この機能はローカルサーバーの基本要件ではない。初期版は利用者が `marksites serve` を明示的に起動・停止する。常駐リソースが実際に問題になり、対応OSの範囲が決まった場合にだけ、独立した追加機能として再検討する。

## セキュリティ

- `127.0.0.1` のみにバインドする。
- `Host` と `Origin` を検証する。
- 更新APIはJSONリクエストだけを受け付ける。
- リクエスト本文のサイズを制限する。
- `../` を含むパスを拒否する。
- シンボリックリンク経由の範囲外アクセスを拒否する。
- コメント本文をHTMLとして挿入しない。
- JSON保存先を出力フォルダ配下へ固定する。
- Markdown内の生HTMLがコメントAPIを不正操作できないよう、サーバーモードではレスポンスごとにランダムnonceを生成するCSPを適用する。
- marksites自身が生成した既知のブラウザスクリプトだけを内容とマーカーの両方で照合してnonceを付与する。Markdown内の`script`やイベント属性から生成されたスクリプトは実行を許可しない。
- `file://`ではHTTP APIが存在せず、従来どおりの単体HTMLとして表示する。

### インポート・エクスポートAPI

- `GET /_marksites/api/v1/annotations/export` は、プロジェクト内のコメントJSONを文書パス順にまとめたスナップショットを返す。正本は変更しない。
- `POST /_marksites/api/v1/annotations/import` は、`{ "export": ..., "replace": false }` を受け取り、初期値ではIDが重複しないコメントだけをマージする。
- 置換には `replace: true` に加えて `confirmReplace: true` が必要で、暗黙に既存コメントを失わないようにする。
- インポート後は各対象HTMLと管理ファイルを差分更新する。

## 実装段階

具体的な実装タスクと完了条件は [ローカルサーバー・コメント機能 実装TODO](./local-server-design-todo.md) に記載する。

### 第1段階: 差分変換基盤

- `.marksites-build.json`
- Markdownハッシュによる更新判定
- 変更された本文だけの再変換
- ファイルツリー変更時の全体無効化
- コメントJSONの新規作成と既存JSONの保護

### 第2段階: 軽量サーバー

- `marksites serve`
- 静的ファイル配信
- ヘルスチェック
- ループバック限定
- パス検証

### 第3段階: 選択操作と閲覧専用表示

- 選択文字列のコピー
- AI用コピー
- コメント入力UI
- 静的HTMLへのコメント埋め込み
- 静的モードでの編集操作無効化
- サーバーモードの検出

### 第4段階: JSON編集

- コメントAPI
- JSONへの保存
- revisionによる競合検知
- コメント編集・削除
- インポート・エクスポート

### 将来の検討候補（未合意）

次の項目は確定要件ではない。これまでの相談から派生した案であり、必要性を確認してから個別に仕様化する。

| 候補                           | 書き出した理由                                                   |
| ------------------------------ | ---------------------------------------------------------------- |
| コメント一覧                   | コメント数が増えた場合の移動・確認手段として補足した案           |
| 解決済み状態                   | レビュー運用を想定して補足した案                                 |
| Markdown変更後の選択位置再特定 | コメント対象の文章が編集された場合に表示位置がずれる問題への対策 |
| 任意の `--watch`               | Markdown変更後の手動再変換を省く案。差分変換そのものとは別要件   |
| ブラウザ自動更新               | `--watch` を導入した場合の確認操作を減らす案                     |
| OSのソケットアクティベーション | リクエスト時だけ一時サーバーを起動したいという相談から追加した案 |

## 確定した実装判断

1. 文書メタデータJSONは`.<HTML basename>.json`とする。ドットファイルとして通常のフォルダ表示を簡潔に保ち、コメント以外の文書固有情報も将来追加できる汎用ファイルとして扱う。JSON内部は初期版のコメントスキーマを維持する。
2. 差分変換はディレクトリ変換へ適用し、単一ファイルは毎回変換する。どちらも隣接コメントJSONを作成・保持する。
3. Markdown削除時は旧HTMLを削除し、コメントJSONは孤立ファイルとして保持・警告する。
4. `serve`は一時フォルダではなく、指定された永続出力フォルダを配信する。
5. 出力互換バージョンを管理ファイルへ保存し、変更時だけ全体を再変換する。
6. サーバーモードの生HTML対策には、既知スクリプト照合とnonceベースCSPを使用する。

出力フォルダ自体を手動削除した場合に備えた別の正本・自動バックアップは未導入であり、エクスポートを利用者が明示的に保管する。6. marksites本体の更新を常に全体再変換の条件にするか、出力互換バージョンを別に持つか。
