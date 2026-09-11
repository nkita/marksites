# marksites

Markdownを、GitHub風のスタンドアロンHTMLへ変換します。生成HTMLはCSSとJavaScriptを内包し、`file://`でも閲覧できます。

## 主な機能

- GitHub風スタイル、見出しアンカー、目次
- ファイルツリー、パンくず、更新順一覧
- Markdown原文、最新版、過去版との差分表示
- コードのハイライト、コピー、折り返し
- 表のコピー、列幅変更、ソート、固定見出し
- ライト／ダークテーマ、日本語／英語UI
- `serve`実行中のコメント編集

## 差分表示

最新版と保持中の過去版を左右で比較します。比較元は「前バージョン」横の一覧から選択できます。

- 削除: 赤
- 追加: 青
- 狭い画面: 横スクロール
- 既定の履歴: 過去5世代

## インストール

```sh
npm install
npm run build
```

## ライブラリとして使う

```ts
import { markdownToHtml } from "marksites";

const html = markdownToHtml("# Hello", { title: "My page" });
```

主なオプション:

| オプション | 説明 |
| --- | --- |
| `title` | ページタイトル |
| `modifiedAt` | ISO 8601形式の更新日時 |
| `highlight` | コードハイライトの有効・無効 |
| `tableOfContents` | 目次の有効・無効、タイトル、見出し範囲 |

```ts
const html = markdownToHtml(markdown, {
  modifiedAt: "2026-07-17T03:00:00.000Z",
  highlight: true,
  tableOfContents: { title: "目次", minDepth: 2, maxDepth: 4 },
});
```

## CLIとして使う

### コマンド

| 操作 | コマンド |
| --- | --- |
| 変換 | `npx marksites [input] [output] [options]` |
| 変換して配信 | `npx marksites serve [input-directory] [output-directory] [options]` |

入力を省略すると`.`、出力を省略すると`./marksites/`を使用します。

### オプション

| オプション | 対象 | 説明 | 既定値・制約 |
| --- | --- | --- | --- |
| `--history-limit <count>` | 共通 | 保持する過去世代数 | `5`、1以上 |
| `--watch` | 共通 | 変更を監視して再変換 | ディレクトリ入力のみ |
| `--verbose` | 共通 | 文書ごとの処理結果を表示 | 無効 |
| `--host <host>` | `serve` | 待受ホスト | `127.0.0.1` |
| `--port <port>` | `serve` | 待受ポート | `3000`から空きを探索。範囲は0～65535 |
| `--open` | `serve` | 起動後にブラウザを開く | 無効 |

### 実行例

```sh
npx marksites README.md README.html
npx marksites docs public --history-limit 10
npx marksites docs public --watch --verbose
npx marksites serve docs public --port 4000 --open
```

ディレクトリ変換では、相対構造と文書間リンクを維持します。`.gitignore`、標準除外ディレクトリ、既存の生成先も探索から除外します。

## コメントを編集する

```sh
npx marksites serve docs public/docs
```

`serve`実行中は、選択範囲または文書全体へコメントを追加・編集できます。停止後のHTMLでは閲覧のみ可能です。

詳細は[ローカルサーバー設計](docs/local-server-design.md)を参照してください。

## Webアプリで公開する

静的ファイル用ディレクトリへ出力します。

```sh
npx marksites docs public/docs
```

```json
{
  "scripts": {
    "build:docs": "marksites docs public/docs",
    "build": "npm run build:docs && next build"
  }
}
```

## 開発

依存パッケージは、未確認の新バージョンを自動取得しないよう`latest`を使用せず、検証済みバージョンを`package.json`と`package-lock.json`へ記録します。更新時はバージョンを明示的に変更し、テストを実行します。

```sh
npm test
```

Markdownの解析には [marked](https://marked.js.org/)、表示スタイルには [github-markdown-css](https://github.com/sindresorhus/github-markdown-css)、コードのシンタックスハイライトには [highlight.js](https://highlightjs.org/) を使用しています。
