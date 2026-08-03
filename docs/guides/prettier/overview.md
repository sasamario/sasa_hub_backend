# Prettierについて(汎用知識)

コードの見た目(改行・引用符・インデントなど)を自動整形するツール。
本プロジェクト固有の設定変更は `docs/guides/setup.md` を参照。

参考: [Prettier公式ドキュメント](https://prettier.io/docs/) /
[Configuration File](https://prettier.io/docs/configuration) /
[Options一覧](https://prettier.io/docs/options)

## 思想: 設定項目をできるだけ増やさない

Prettierは「書式について議論する時間をなくす」ことを目的にしたツールで、
あえて設定できる項目を少なく保っている(公式スタンス)。多くのプロジェクトでは
`singleQuote` と `trailingComma` くらいしか上書きしないことが多い。

## 設定ファイルの自動読み込み

以下のようなファイル名を、実行時にプロジェクトルートから自動的に探して読み込む
(`--config` オプション不要)。上から順に優先される主なもの:

- `.prettierrc` / `.prettierrc.json` / `.prettierrc.yaml`
- `.prettierrc.js` / `.prettierrc.mjs` / `.prettierrc.cjs`
- `prettier.config.js` / `prettier.config.mjs` / `prettier.config.cjs`
- `package.json` の `"prettier"` フィールド

**JSON形式(`.prettierrc`)にはコメントを書けない。** コメントで意図を残したい場合は
JavaScript形式(`prettier.config.mjs`など)を使う必要がある(本プロジェクトの選択)。

## JSDocによる型注釈(`.mjs`でも型チェックを効かせる)

```javascript
/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
};
```

- `.mjs` は素のJavaScriptファイルだが、`@type {...}` というJSDocコメントで
  「この値の型はこれです」とエディタ(TypeScriptの言語サーバー)に伝えられる。
- `import("prettier").Config` は、`prettier` パッケージが持つ型定義から
  `Config` 型だけをその場で参照する書き方(ファイル先頭でのimport文が不要)。
- これにより、プロパティ名の補完や、誤った値を入れた際のエラー表示がエディタ上で効くようになる。

## 主なデフォルト値(参考)

明示的に上書きしない限りこの値になる。本プロジェクトでは学習のため、
値は変えずにコメント付きで明示している(`prettier.config.mjs`参照)。

| 項目 | デフォルト値 | 内容 |
|---|---|---|
| `printWidth` | 80 | 1行の最大文字数 |
| `tabWidth` | 2 | インデント幅(スペース数) |
| `useTabs` | false | インデントはタブではなくスペース |
| `semi` | true | 文末にセミコロンを付ける |
| `bracketSpacing` | true | `{ foo }` のように中括弧の内側にスペースを入れる |
| `singleQuote` | false | 文字列はダブルクォート(本プロジェクトでは`true`に上書き) |
| `trailingComma` | all(Prettier 3系のデフォルト) | 配列・オブジェクトの末尾にもカンマを付ける |
