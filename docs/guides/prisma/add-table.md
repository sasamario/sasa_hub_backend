# テーブルを追加する手順(Prisma)

Prismaを使って新しいテーブルを追加する際の、汎用的な作業の流れ。
Prismaスキーマの文法・命名規則の詳細は `docs/guides/prisma/schema.md`、
CLIコマンドの詳細は `docs/guides/prisma/cli.md` を参照。

## 1. `prisma/schema.prisma` にモデルを書く

新しい `model` ブロック(必要であれば `enum` も)を追加する。

## 2. 整形する

```bash
docker compose exec app npx prisma format
```

型・属性の列位置を自動で揃える。手動で位置を揃える必要はない。書いている最中は
位置を気にせず、最後にこのコマンドで整えればよい。

## 3. マイグレーションを作成・適用する

```bash
docker compose exec app npx prisma migrate dev --name <変更内容を表す名前>
```

このコマンド1回で「マイグレーションファイルの生成」「開発用DBへの適用」
「`prisma generate`(TypeScriptクライアント再生成)」までまとめて行われる。

## 4. 生成されたSQLとDBの中身を確認する

- `prisma/migrations/<タイムスタンプ>_<名前>/migration.sql` を開き、意図通りのテーブル・型・
  制約になっているか確認する
- pgAdminや、以下のコマンドで実際にDBにテーブルが作られているか確認する

```bash
docker compose exec db psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "\dt"
```

## スキーマを書く上での注意点

- **モデル名はパスカルケース・単数形**(例: `GithubActivity`)、**フィールド名はキャメルケース**が
  Prismaの慣例。実DBのテーブル名・カラム名をスネークケースにしたい場合は、
  `@@map("テーブル名")` / `@map("カラム名")` で対応付ける(詳細・理由は`schema.md`参照)。
- **enumにも`@@map`が使える。** enum型自体のDB上の型名もスネークケースに揃えられる。
- **「作成日時」を自動セットする専用属性は存在しない。** `@default(now())` で代用する
  (`@updatedAt`だけが「更新の度に変わる」という特別な専用属性を持つ)。
- **複合の一意制約は `@@unique([フィールド1, フィールド2])` をモデル内に書く**(モデルの外に
  独立した行として置く。個々のフィールドの後ろに書く`@unique`とは書き方が異なる)。
- マイグレーションは「テーブル単位」ではなく「**意味のある変更のまとまり(1回の作業・1つの機能)
  単位**」で区切るとよい。複数テーブルを一体で設計した場合はまとめて1回のマイグレーションでよく、
  無理にテーブルごとに分ける必要はない。
