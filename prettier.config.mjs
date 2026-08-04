// @ts-check

/** @type {import("prettier").Config} */
export default {
  // 文字列はシングルクォートで統一する(デフォルトはfalse=ダブルクォート。ここは意図的な上書き)
  singleQuote: true,

  // 以下はPrettier 3系のデフォルト値のまま。値は変えず、学習のため明示的に書いている。
  printWidth: 80, // デフォルト。1行の最大文字数
  tabWidth: 2, // デフォルト。インデント幅(スペース数)
  useTabs: false, // デフォルト。インデントはタブではなくスペース
  semi: true, // デフォルト。文末にセミコロンを付ける
  bracketSpacing: true, // デフォルト。`{ foo }` のように中括弧の内側にスペースを入れる
  // 配列・オブジェクトの末尾にも常にカンマを付ける。
  // Prettier 3系のデフォルト(2系までは`es5`がデフォルトだった)。
  trailingComma: 'all',
};
