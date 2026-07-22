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

見出しレベル2から6までの目次と、GitHub互換の見出しアンカーが自動生成されます。ファイルツリーはGitHubのFilesペインと同様、画面左端へ接する全高のサイドバーとして常時表示し、本文を中央、`目次`とコメントを画面右側へ配置します。左サイドバーはヘッダーの四角いペインアイコンで折り畳むことができ、閉じると本文が左へ広がります。閉じた場合はページ上部に同形の復帰アイコンと、従来どおりポップオーバーでファイル一覧を開く`ファイル`ボタンを並べます。サイドバーの閉状態は`file-sidebar=closed`、ポップオーバーは`marksites-files=open`、開いたフォルダは短縮IDを値とする`open` GETパラメータでページ間に引き継がれます。ファイルパス直後のアイコンでパスをコピーでき、右端にはMarkdownの更新日時をブラウザのローカルタイムゾーンで`YYYY-MM-DD HH:mm:ss`形式にして表示します。タイムゾーン名やUTCオフセットは表示しません。JavaScript実行前はUTCの日時を同じ形式で表示します。現在位置に対応する見出しもハイライトされます。狭い画面では右サイドバーを本文上部、ファイルサイドバーを必要なときだけ開く固定オーバーレイとして表示します。

左ファイルサイドバーは幅280pxとし、開閉アイコンは枠線なしで表示します。

画面上端には固定ヘッダーを表示します。右上の月・太陽アイコンでライト／ダークモードを切り替え、地球アイコンで生成UIの日本語／英語を切り替えます。Markdown本文、見出し、ファイル名、コメント本文は翻訳対象にしません。選択状態は`theme`と`lang` GETパラメータでページ間に引き継がれます。

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

フォルダを指定すると、配下の `.md` と `.markdown` を再帰的に変換します。出力先でも元のフォルダ階層を維持し、各ページの左側にファイル名で絞り込めるファイルツリー、本文上部に現在のファイルパスを示すパンくずを表示します。コメントが1件以上あるファイルには件数バッジを表示し、上位フォルダには配下の有効コメント合計件数を表示します。Markdownファイル間の相対リンクは `.html` へ書き換えられます。

相対パスで参照したローカル画像は、内容ハッシュ付きの名前で出力先の`_marksites-assets/`へコピーされます。同名画像の衝突を避け、画像変更時は参照するHTMLだけを更新します。外部URL、data URL、ルート相対URLはそのまま保持します。本文画像をクリックすると全画面ビューアーが開き、ボタンまたはホイールで拡大・縮小でき、ドラッグで位置を移動できます。Escapeまたは右上の閉じるボタンで閉じます。

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

ディレクトリ変換または`serve`へ`--watch`を付けると、Markdownや参照画像の変更を検知して差分変換します。Markdownの新規追加や削除、新しいサブディレクトリにも対応します。

`--verbose`を付けると、文書ごとの変換・スキップ結果を表示します。`--watch`と併用した場合は、検知したイベント種別・対象パスと再変換の開始も表示します。

```sh
npx marksites docs public/docs --watch
npx marksites serve docs public/docs --port 4000 --watch --verbose
```

サーバーは起動時に差分変換を行い、`--watch`指定時だけイベント駆動で入力を監視します。ポーリングや常駐文書キャッシュは使用しません。停止後もコメントはHTMLへ埋め込まれているため、生成HTMLを`file://`で閲覧できます。この場合、コメントは閲覧専用です。

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

依存パッケージは、未確認の新バージョンを自動取得しないよう`latest`を使用せず、検証済みバージョンを`package.json`と`package-lock.json`へ記録します。更新時はバージョンを明示的に変更し、テストを実行します。

```sh
npm test
```

Markdownの解析には [marked](https://marked.js.org/)、表示スタイルには [github-markdown-css](https://github.com/sindresorhus/github-markdown-css)、コードのシンタックスハイライトには [highlight.js](https://highlightjs.org/) を使用しています。
