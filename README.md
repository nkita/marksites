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

## CLIとして使う

```sh
npx mark-sites README.md README.html
```

出力先を省略すると、入力ファイルと同じ場所に拡張子 `.html` で保存します。

## 開発

```sh
npm test
```

Markdownの解析には [marked](https://marked.js.org/)、表示スタイルには [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) を使用しています。
