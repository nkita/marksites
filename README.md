# marksites

Markdownを、GitHub風のスタイルを埋め込んだ単独のHTMLファイルへ変換するTypeScriptライブラリです。

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

更新日時を表示する場合は、ISO 8601形式で指定します。CLI変換ではMarkdownファイルの最終更新日時が自動的に使用されます。

```ts
const html = markdownToHtml(markdown, {
  modifiedAt: "2026-07-17T03:00:00.000Z",
});
```

見出しレベル2から6までの目次と、GitHub互換の見出しアンカーが自動生成されます。本文は画面左側、`Outline` と表示される目次は画面右側に配置され、目次はスクロールに追従します。ディレクトリ変換時のファイルツリーは、ページ上部の `Files` ボタンをクリックするとポップオーバー表示されます。ポップオーバーは`marksites-files`、開いたフォルダは短縮IDを値とする`open` GETパラメータでページ間に引き継がれます。ファイルパス直後のアイコンでパスをコピーでき、右端にはMarkdownの更新日時をブラウザのローカルタイムゾーンで`YYYY-MM-DD HH:mm:ss TZ`形式にして表示します。JavaScript実行前はUTC表示です。現在位置に対応する見出しもハイライトされます。狭い画面では折り畳み可能なstickyメニューとして本文の上に表示します。

```ts
const html = markdownToHtml(markdown, {
  tableOfContents: {
    title: "目次",
    minDepth: 2,
    maxDepth: 4,
  },
});
```

目次を無効にする場合は `tableOfContents: false` を指定します。見出しのアンカーIDはそのまま生成されます。

言語名を指定したコードブロックは、`highlight.js` によって自動的にハイライトされます。
コードブロックには、コードをクリップボードへコピーするボタンと、長い行の折り返しを切り替えるボタンも表示されます。

````markdown
```typescript
const greeting: string = "Hello";
console.log(greeting);
```
````

ハイライトを無効にすることもできます。

```ts
const html = markdownToHtml(markdown, { highlight: false });
```

## CLIとして使う

```sh
npx marksites README.md README.html
```

入力と出力を両方省略すると、カレントディレクトリ配下のMarkdownを`./marksites/`へ変換します。

```sh
npx marksites
# npx marksites . marksites と同じ
```

単一Markdownの出力先を省略した場合も、`./marksites/`へ同じbasenameのHTMLを保存します。

フォルダを指定すると、配下の `.md` と `.markdown` を再帰的に変換します。出力先でも元のフォルダ階層を維持し、各ページの左側にファイル名で絞り込めるファイルツリー、本文上部に現在のファイルパスを示すパンくずを表示します。コメントが1件以上あるファイルには、ツリー上で件数バッジを表示します。Markdownファイル間の相対リンクは `.html` へ書き換えられます。

```sh
npx marksites docs public
```

ディレクトリ変換の出力先を省略した場合は、カレントディレクトリの`marksites/`へ出力します。

```sh
npx marksites docs
# ./marksites/ に出力
```

プロジェクトルートを対象にする場合、`.git`、`node_modules`、`dist`、`coverage`は探索対象から除外されます。

入力フォルダ配下の`.gitignore`を読み込み、Gitと同じパターン規則で除外されたファイルとフォルダを変換対象から外します。ネストした`.gitignore`と`!`による再包含にも対応します。また、`.marksites-build.json`を持つ既存の生成フォルダと、今回指定された出力フォルダは常に探索対象外です。

2回目以降はMarkdown本文、コメント、ファイル構成、レンダー設定のSHA-256を比較し、影響したHTMLだけを再生成します。管理情報は出力先直下の `.marksites-build.json`、文書ごとのメタデータは各HTMLに隣接する `.<名前>.json` に保存されます。このJSONは再変換時にも上書きされません。現在はコメント情報を格納し、将来は文書固有のほかの情報も管理できるファイルとして扱います。

### コメントを編集する

軽量ローカルサーバーの起動中だけ、本文の選択範囲へコメントを追加・編集・削除できます。

右サイドバーでは目次と現在ページのコメント一覧をタブで切り替えられます。タブにはコメント件数が表示され、コメントを選ぶと本文の対象箇所へ移動します。一覧先頭の追加ボタンから、範囲を選択しない文書全体へのコメントも作成できます。ヘッダーは固定され、各パネルは独立してスクロールします。

```sh
npx marksites serve docs public/docs
# 通常は http://127.0.0.1:3000
```

入力・出力を省略して、カレントディレクトリを`./marksites/`へ変換・配信することもできます。

```sh
npx marksites serve
# npx marksites serve . marksites と同じ
```

`--host`、`--port`、`--open`を指定できます。ポートを省略すると3000を使用し、すでに使用中なら3001、3002の順に空きポートを自動選択します。`--port`を明示した場合は指定ポートだけを使用し、競合時はエラーになります。`--port 0`ではOSに空きポートを割り当てさせることもできます。実際のURLは起動時に表示され、`--open`もそのURLを開きます。

サーバーは起動時に差分変換を行い、アイドル中のファイル監視や定期処理は行いません。停止後もコメントはHTMLへ埋め込まれているため、生成HTMLを`file://`で閲覧できます。この場合、コメントは閲覧専用です。

`--open`はWindows、macOS、Linuxに加えてWSLからWindows側のブラウザを開く処理にも対応します。ブラウザ起動コマンドが見つからない場合もサーバーは停止せず、表示されたURLを手動で開けます。

入力フォルダに`index.md`または`index.markdown`がある場合は、そのページを`/`で表示します。存在しない場合は、変換対象のファイルパスを並べたときの先頭ページを表示します。

詳細な設計と運用上の注意は[ローカルサーバー設計](docs/local-server-design.md)を参照してください。

### Webアプリの静的ファイルとして公開する

Next.jsやVue、ViteなどのWebアプリで公開する場合は、アプリの静的ファイル用ディレクトリ配下を出力先に指定します。

```sh
npx marksites docs public/docs
```

例えば `docs/index.md` と `docs/guide.md` は、それぞれ `public/docs/index.html` と `public/docs/guide.html` に変換されます。Webアプリからは `/docs/index.html` と `/docs/guide.html` への通常のリンクとして参照できます。

Webアプリをビルドする前にHTMLを生成するよう、npmスクリプトへ追加できます。

```json
{
  "scripts": {
    "build:docs": "marksites docs public/docs",
    "build": "npm run build:docs && next build"
  }
}
```

Viteを使用する場合は、`next build` を `vite build` に置き換えます。

## 開発

```sh
npm test
```

Markdownの解析には [marked](https://marked.js.org/)、表示スタイルには [github-markdown-css](https://github.com/sindresorhus/github-markdown-css)、コードのシンタックスハイライトには [highlight.js](https://highlightjs.org/) を使用しています。
