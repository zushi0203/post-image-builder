# GIF Frame Extractor - Proof of Concept

GIFファイルからフレーム情報を抽出する機能の検証実装です。

## 目的

本体アプリケーションで使用するGIFフレーム解析機能の最適な実装方法を検証する。

## 実装アプローチ

### 1. gifuct-js ライブラリ使用
- 軽量なGIF解析ライブラリ
- ブラウザ環境対応
- フレーム情報（画像データ、遅延時間、座標等）を取得可能

## ファイル構成

```
gif-frame-extractor/
├── README.md              # 本ファイル
├── package.json           # 依存関係
├── index.html            # テスト用HTML
├── src/
│   ├── gifFrameExtractor.ts  # メイン実装
│   ├── types.ts             # 型定義
│   └── utils.ts             # ユーティリティ関数
└── test/
    └── sample.gif           # テスト用サンプルGIF
```

## 使用方法

```bash
cd packages/sandbox/gif-frame-extractor
npm install
npm run dev
```

## 検証ポイント

- [ ] GIFフレーム数の正確な取得
- [ ] 各フレームの画像データ取得
- [ ] フレーム間の遅延時間取得
- [ ] メモリ使用量の測定
- [ ] パフォーマンス測定
- [ ] 大きなGIFファイルでの動作確認