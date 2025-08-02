# Lintツールについて

## 1. 使用ツール

本プロジェクトでは、コード品質を保つために以下のLintツールを使用します。

### 1.1 JavaScript / TypeScript

**ESLint**を使用してコードの品質チェックを行います。TypeScriptとReactに対応したルールセットを導入し、基本的なエラーや問題のあるコードパターンを検出します。

### 1.2 CSS

**Stylelint**を使用してCSSの品質チェックを行います。CSS記法の間違いや、一般的でないプロパティの使用を検出します。

### 1.3 コードフォーマット

**Prettier**を使用してコードの自動フォーマットを行います。チーム内でのコードスタイルを統一し、可読性を向上させます。

## 2. 設定方針

最低限のエラーチェックから始めて、段階的にプロジェクトに適した設定に調整していきます。

### 2.1 ESLint

TypeScriptとReactプロジェクトに必要最小限の設定を使用します。

- `@typescript-eslint/recommended` - TypeScript固有の基本ルール
- `react-hooks/recommended` - React Hooksの正しい使用法をチェック

### 2.2 Stylelint

CSS記法の基本的なエラーをチェックする設定を使用します。

- `stylelint-config-standard` - CSS記法の標準的なルール

### 2.3 Prettier

デフォルト設定を使用してコードフォーマットを統一します。必要に応じてプロジェクト固有の調整を行います。