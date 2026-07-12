# mark-sites

Markdownを、GitHub風のスタイルを埋め込んだ単独のHTMLファイルへ変換するTypeScriptライブラリです。

## インストール

```sh
npm install
npm run build
```

## ライブラリとして使う

```ts
import { markdownToHtml } from "mark-sites";

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
npx mark-sites README.md README.html
```

出力先を省略すると、入力ファイルと同じ場所に拡張子 `.html` で保存します。

## 開発

```sh
npm test
```

Markdownの解析には [marked](https://marked.js.org/)、表示スタイルには [github-markdown-css](https://github.com/sindresorhus/github-markdown-css)、コードのシンタックスハイライトには [highlight.js](https://highlightjs.org/) を使用しています。
