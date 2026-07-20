# annotations feature仕様

## 責務

生成HTMLに埋め込む注釈UI、そのスタイル、ブラウザ動作を所有する。Node側の注釈モデルと永続化は`src/annotations/`が所有する。

## ファイル

- `index.ts`: 注釈Featureを構成する内部エントリポイント。

ブラウザUI固有の型を公開APIへ漏らさない。
