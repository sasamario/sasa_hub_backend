// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // any型の使用を許可する。外部APIレスポンスの型付けなど、
      // 現実的にanyが必要な場面が多い開発初期はoffのままにしておく。
      '@typescript-eslint/no-explicit-any': 'off',
      // awaitし忘れたPromiseをエラーにする。同期処理(GitHub/Qiita API呼び出し)は
      // await漏れがあるとエラーが握りつぶされ、原因が分かりにくいバグになるため厳格にする。
      '@typescript-eslint/no-floating-promises': 'error',
      // any型の値を型付き引数に渡すのを警告する(エラーにはしない)
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // 改行コードの違い(LF/CRLF)をエラーにしない。
      // WindowsとMac/Linuxが混在する開発環境でも差分がノイズにならないようにするため。
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);
