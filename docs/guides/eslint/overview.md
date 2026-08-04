# ESLintについて(汎用知識)

コードの静的解析(バグになりやすい書き方・お作法違反の検出)を行うツール。
本プロジェクト固有の設定変更は `docs/guides/setup.md` を参照。

参考: [ESLint公式ドキュメント](https://eslint.org/docs/latest/) /
[Configuration Files(Flat Config)](https://eslint.org/docs/latest/use/configure/configuration-files) /
[typescript-eslint](https://typescript-eslint.io/)

## 設定ファイルの自動読み込み(Flat Config)

ESLint v9以降の設定方式(Flat Config)では、プロジェクトルートにある
`eslint.config.js` / `.mjs` / `.cjs` / `.ts` を実行時に**自動的に探して読み込む**。
`--config` オプションで明示的に指定する必要はない。

```bash
eslint "src/**/*.ts"   # eslint.config.mjs が自動で使われる
```

以前の設定方式(`.eslintrc.json` など)は「Legacy Config」と呼ばれ、順次廃止されている。
NestJS CLIが生成する雛形は既にFlat Config形式(`eslint.config.mjs`)。

## `typescript-eslint`について

ESLint本体はJavaScript用の静的解析ツールであり、TypeScript構文を直接は理解できない。
`typescript-eslint` は、TypeScriptのコードをESLintが解析できるようにするパーサー・
ルール集をまとめたパッケージ。

- `tseslint.config(...)`: 複数の設定オブジェクトを渡してFlat Config用の設定配列を作るヘルパー
- `tseslint.configs.recommendedTypeChecked`: 型情報を使った(より厳密な)推奨ルールセット
  (`parserOptions.projectService: true` の指定が必要。型チェックのために `tsconfig.json` を
  参照するため、通常のLintよりわずかに実行が遅くなる)

## `eslint-plugin-prettier`について

ESLintとPrettier(フォーマッター)を併用する際、書式の崩れを「ESLintのルール違反」として
検出・自動修正できるようにするプラグイン。`eslintPluginPrettierRecommended` を設定に加えることで、
Prettierのフォーマットルールが `prettier/prettier` という1つのESLintルールとして扱われる。

## 本プロジェクトでカスタマイズしたルール(参考)

詳細な理由は `docs/guides/setup.md` を参照。

| ルール | 設定 | 意図 |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | off | 外部APIレスポンスの型付けなど、開発初期は`any`が現実的に必要な場面が多いため |
| `@typescript-eslint/no-floating-promises` | error | awaitし忘れによる、外部API呼び出し失敗の握りつぶしを防ぐため |
| `@typescript-eslint/no-unsafe-argument` | warn | Nest CLI標準のまま |
