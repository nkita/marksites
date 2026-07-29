# table-of-contents仕様

## 責務

GitHub互換の見出しID、目次マークアップ、現在見出しの追従動作を所有する。

## ファイル

- `index.ts`: table-of-contents Featureの内部エントリポイント。

本文スクロールに応じて現在位置のリンクへ`aria-current="location"`を付け、アクティブリンクが目次の表示範囲外へ移動した場合は目次パネル内を自動スクロールして中央付近へ表示する。
