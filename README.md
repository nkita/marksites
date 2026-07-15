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

見出しレベル2から6までの目次と、GitHub互換の見出しアンカーが自動生成されます。本文は画面左側、目次は画面右側に配置され、目次はスクロールに追従します。現在位置に対応する見出しもハイライトされます。狭い画面では折り畳み可能なstickyメニューとして本文の上に表示します。

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

出力先を省略すると、入力ファイルと同じ場所に拡張子 `.html` で保存します。

フォルダを指定すると、配下の `.md` と `.markdown` を再帰的に変換します。出力先でも元のフォルダ階層を維持し、各ページの左側にファイル名で絞り込めるファイルツリー、本文上部に現在のファイルパスを示すパンくずを表示します。Markdownファイル間の相対リンクは `.html` へ書き換えられます。

```sh
npx marksites docs public
```

出力先を省略した場合は、入力フォルダと同じ階層に `<入力名>-html` フォルダを作成します。

```sh
npx marksites docs
# docs-html/ に出力
```

2回目以降はMarkdown本文、コメント、ファイル構成、レンダー設定のSHA-256を比較し、影響したHTMLだけを再生成します。管理情報は出力先直下の `.marksites-build.json`、文書ごとのメタデータは各HTMLに隣接する `.<名前>.json` に保存されます。このJSONは再変換時にも上書きされません。現在はコメント情報を格納し、将来は文書固有のほかの情報も管理できるファイルとして扱います。

### コメントを編集する

軽量ローカルサーバーの起動中だけ、本文の選択範囲へコメントを追加・編集・削除できます。

```sh
npx marksites serve docs public/docs
# http://127.0.0.1:3000
```

`--host`、`--port`、`--open`を指定できます。サーバーは起動時に差分変換を行い、アイドル中のファイル監視や定期処理は行いません。停止後もコメントはHTMLへ埋め込まれているため、生成HTMLを`file://`で閲覧できます。この場合、コメントは閲覧専用です。

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
