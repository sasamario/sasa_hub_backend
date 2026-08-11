# Prismaのトラブルシューティング(汎用知識)

Prisma導入・運用中に遭遇したエラーとその対処法をまとめる。

## `ReferenceError: exports is not defined in ES module scope`

### 発生状況

NestJS(CommonJSベース)のアプリから、`PrismaClient`(新しいジェネレーター`provider = "prisma-client"`で
生成したもの)をimportして使おうとすると、アプリ起動時に以下のエラーで落ちる。

```
ReferenceError: exports is not defined in ES module scope
    at file:///app/dist/generated/prisma/client.js:38:23
```

### 原因

**Prisma 6.7以降の新しいジェネレーター(`provider = "prisma-client"`)は、デフォルトでESM形式のコードを
生成する。** 一方NestJS(このプロジェクトも含む)は、`package.json`に`"type": "module"`が無い
CommonJS前提のセットアップであることが多い。このモジュール形式の不一致が原因。

具体的には:

- 生成された元のソース(`generated/prisma/client.ts`)はESM形式(`import`/`export`、
  `import.meta.url`を使用)で書かれている
- これをアプリのビルド処理(`nest build`)がCommonJSに変換しようとするが、
  `import.meta.url`にはCommonJSで書ける対応表現が存在しないため、**変換しきれずそのまま残る**
- 結果、ファイルの大部分は`exports.foo = ...`というCommonJSの書き方になっているのに、
  `import.meta.url`という**ESM専用の記述も混在**した状態のファイルができあがる
- Node.jsはファイル内に`import.meta`を見つけると「これはESMだ」と判断してESMとして読み込もうと
  するが、ESMの世界には`exports`という変数は存在しないため、上記のエラーになる

旧ジェネレーター(`provider = "prisma-client-js"`。以前のデフォルト)では、最初からCommonJS形式で
生成されるため、この問題自体が起きない。**Prisma 6.7以降の新ジェネレーター特有の問題。**

### 対処法

`prisma/schema.prisma`の`generator client`ブロックに`moduleFormat = "cjs"`を追加し、
Prismaに最初からCommonJS向けのソースコード(`import.meta.url`ではなく`__dirname`を使うもの)を
生成させる。

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}
```

追加後、生成物を作り直す(手順は`docs/guides/prisma/nestjs-integration.md`「スキーマを変更・追加する場合」参照)。

```bash
docker compose exec app npx prisma generate
```

### この対処による影響

- **アプリ側のコード(`import { PrismaClient } from '../../generated/prisma/client'`のような
  呼び出し方)には影響しない。** 変わるのはPrismaが生成するファイルの内部的な書き方だけ
  (`require`/`exports`を使うか`import`/`export`を使うか、パス解決に`__dirname`を使うか
  `import.meta.url`を使うか)。
- `moduleFormat`は「アプリ全体のモジュール形式に、生成物を合わせる」ための設定という位置づけ。
  もし将来アプリ自体をESM化する(`package.json`に`"type": "module"`を追加する)場合は、
  `moduleFormat = "esm"`に変更する必要がある。

### 参考(既知の問題として報告されている)

- [ReferenceError: exports is not defined in ES module scope for `provider = "prisma-client"` · Issue #27556 · prisma/prisma](https://github.com/prisma/prisma/issues/27556)
- [Prisma | NestJS - A progressive Node.js framework(公式)](https://docs.nestjs.com/recipes/prisma)
