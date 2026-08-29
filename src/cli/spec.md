# cli仕様

## 責務

`src/cli/`はCLI入力の解析、結果表示、ブラウザ起動、各コマンドの実行フローを所有する。`src/cli.ts`はサブコマンドのディスパッチと最上位エラー処理だけを行い、変換処理そのものは`src/conversion/`へ委譲する。

## ファイル

### `directory.ts`

過去の内部参照との互換性を保つ薄いファサードである。次を再exportするだけとし、変換ロジックを追加しない。

- `convertDirectory()`
- `convertDirectoryDetailed()`
- `convertFile()`
- `BUILD_MANIFEST`
- `ConversionResult`

### `open-browser.ts`

- `browserCommands()`: OSごとのブラウザ起動候補を決める。WSLでは`cmd.exe`、Linuxでは`xdg-open`、macOSでは`open`、Windowsでは`cmd.exe`を使用する。
- `tryCommand()`: 子プロセスの`spawn`または`error`を待ち、起動可否をbooleanで返す。
- `openBrowser(url, environment?)`: 候補を順番に試す。起動コマンドがなくても例外でサーバーを停止させない。

`environment`はテスト用の内部注入点であり、公開APIではない。

### `arguments.ts`

- `parseConvertArguments()`: 通常変換の位置引数、watch、verboseを副作用なしで解析する。
- `parseServeArguments()`: serveの位置引数、host、port、open、watch、verboseを副作用なしで解析する。

引数個数またはオプション値が不足する場合は`null`を返してエントリポイントへusage表示を委ね、不明なオプションと不正なportは具体的なエラーにする。

### `reporting.ts`

- `reportConversion()`: 変換集計と孤立した注釈ファイルの警告を表示する。

### `convert-command.ts`

- 通常変換と任意のwatchライフサイクルを所有する。
- 単一ファイルのwatch拒否と、終了シグナルでのwatch停止を扱う。

### `serve-command.ts`

- 初回変換、マニフェスト読込、HTTPサーバーと任意watchの協調を所有する。
- 予約パス検証、ブラウザ起動、終了シグナルでのwatch・サーバー停止を扱う。

## `src/cli.ts`との境界

`src/cli.ts`から呼び出されるコマンドモジュールは次を担当する。

- 解析済みの`marksites [input] [output]`と`marksites serve [input] [output]`の実行
- `--host`、`--port`、`--open`、`--watch`、`--verbose`の処理。ポート未指定時は3000から空きポートを昇順に探索し、`--port`指定時はそのポートだけを使用する
- 通常のディレクトリ変換と`serve`で、`--watch`指定時に入力ディレクトリの変更を監視して差分変換する。単一ファイル入力では`--watch`を受け付けない
- `--verbose`指定時は文書ごとの変換・スキップとwatchイベント、watch再変換開始を表示する。未指定時は従来の集計表示だけを維持する
- 入力省略時のカレントディレクトリ解決
- 変換件数、スキップ、削除、メタデータ移動の表示
- `SIGINT`と`SIGTERM`でのサーバー終了

出力省略時は`./marksites/`を使用する。CLIはMarkdown解析、差分計画、HTTPルーティングを実装しない。
