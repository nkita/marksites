# code-blocks仕様

## 責務

コードブロックのレンダラー、ハイライト、コピーと折り返し操作を所有する。

## ファイル

- `index.ts`: code-blocks Featureの内部エントリポイント。

コピーはセキュアコンテキストでClipboard APIを優先する。APIが存在しても権限拒否などで書き込みに失敗する場合があるため、その場合も一時textareaと`execCommand("copy")`へフォールバックする。両方が失敗した場合だけ失敗として表示する。
