# cli仕様

## 責務

`src/cli/`はCLI周辺の補助処理を所有する。引数解析とサーバー起動のエントリポイントは`src/cli.ts`に置き、変換処理そのものは`src/conversion/`へ委譲する。

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

## `src/cli.ts`との境界

`src/cli.ts`は次を担当する。

- `marksites [input] [output]`と`marksites serve [input] [output]`の解析
- `--host`、`--port`、`--open`の処理。ポート未指定時は3000から空きポートを昇順に探索し、`--port`指定時はそのポートだけを使用する
- 入力省略時のカレントディレクトリ解決
- 変換件数、スキップ、削除、メタデータ移動の表示
- `SIGINT`と`SIGTERM`でのサーバー終了

出力省略時は`./marksites/`を使用する。CLIはMarkdown解析、差分計画、HTTPルーティングを実装しない。
