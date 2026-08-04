# Prismaスキーマの書き方(汎用知識)

`prisma/schema.prisma` にモデル(テーブル)・enum(列挙型)を定義する際の基本文法をまとめる。
実際のコマンド操作は `docs/guides/prisma/cli.md`、Driver Adapter方式は同ファイルを参照。

参考: [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) /
[Data model](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)

## モデル(テーブル)の定義

```prisma
model モデル名 {
  フィールド名 型 属性...
}
```

1つの `model` が1つのテーブルに対応する。

## よく使うフィールドの型

| 型 | 対応するPostgreSQL型 | 用途 |
|---|---|---|
| `Int` | integer | 件数、主キーなど |
| `BigInt` | bigint | `Int`の範囲(約21億)を超える可能性がある数値 |
| `Float` | double precision | 小数(誤差が出うる) |
| `Decimal` | decimal | 金額など誤差が許されない小数 |
| `String` | text | 文字列全般 |
| `Boolean` | boolean | 真偽値 |
| `DateTime` | timestamp | 日時 |
| `Json` | jsonb | 構造化されたJSONデータをそのまま保存したい場合 |
| `Bytes` | bytea | バイナリデータ |

### 型の修飾

- `型?`: NULL許容にする(例: `DateTime?`)。付けなければNOT NULL
- `型[]`: 配列として保存する(例: `String[]`)。PostgreSQL固有の機能で、他のDBでは使えない場合がある

## よく使うフィールド属性(`@`から始まる。フィールドの後ろに書く)

| 属性 | 意味 |
|---|---|
| `@id` | 主キーに指定する |
| `@default(値)` | デフォルト値。`@default(autoincrement())`(自動採番)、`@default(now())`(現在日時)、`@default(0)`(固定値)など |
| `@unique` | そのフィールド単体で一意制約 |
| `@updatedAt` | レコード更新の度に自動で現在日時をセットする専用属性 |
| `@map("db_column_name")` | Prismaスキーマ上のフィールド名と、実際のDBカラム名を別にしたい場合に使う |

補足: 「作成日時」を自動セットする専用属性(`@createdAt`のようなもの)は**存在しない**。
`@default(now())` で代用する(`@updatedAt`だけが「更新の度に変わる」という特別な専用属性を持つ)。

## モデル全体にかかる属性(`@@`から始まる。モデルの中に単独の行として書く)

| 属性 | 意味 |
|---|---|
| `@@id([フィールド1, フィールド2])` | 複数フィールドの組み合わせを主キーにする(複合主キー) |
| `@@unique([フィールド1, フィールド2])` | 複数フィールドの組み合わせで一意制約(複合ユニークキー) |
| `@@index([フィールド1, フィールド2])` | 検索を高速化するためのインデックスを貼る |
| `@@map("db_table_name")` | Prismaスキーマ上のモデル名と、実際のDBテーブル名を別にしたい場合に使う |

```prisma
model Example {
  a String
  b String

  @@unique([a, b]) // aとbの組み合わせで一意制約
  @@map("examples")
}
```

## enum(列挙型)の定義

モデルの外に、独立して定義する。

```prisma
enum Status {
  active
  inactive

  @@map("status") // DB上の型名を指定したい場合
}

model Example {
  status Status
}
```

enumの値自体をDB上で別名にしたい場合は、値ごとに `@map` を付けられる。

```prisma
enum Status {
  active   @map("ACTIVE")
  inactive @map("INACTIVE")
}
```

## 命名規則(TypeScript側とSQL側の橋渡し)

Prismaスキーマは「TypeScriptから使うためのモデル定義」であり、実際のSQL(PostgreSQL)の
慣習とは書き方の流儀が異なる。この橋渡しを `@map` / `@@map` で行うのが定石。

| 対象 | Prismaスキーマでの慣習 | 実DB(PostgreSQL)での慣習 |
|---|---|---|
| モデル名 | パスカルケース・**単数形**(例: `GithubActivity`) | スネークケース・複数形が一般的(例: `github_activities`) |
| フィールド名 | キャメルケース(例: `externalId`) | スネークケース(例: `external_id`) |
| enum名 | パスカルケース(例: `GithubType`) | スネークケース(例: `github_type`) |

**モデル名が単数形である理由**: 1つのモデルは「1件のレコード」を表す単位だから
(例: `GithubActivity`型の値が1つ = 1件のコミット/PR)。実際のテーブルには複数のレコードが
入るため、`@@map`でテーブル名だけ複数形のスネークケースに変換する、という役割分担になる。

**スネークケースが実DB側の慣習である理由**: PostgreSQLはクォートなしの識別子を自動的に
小文字化するため、キャメルケース(`externalId`)のまま作成すると、SQLを直接書く際に
毎回ダブルクォートで囲む必要が出て扱いにくい(`"externalId"`のように)。スネークケースなら
クォート無しでも意図通りに動くため、SQLとの相性がよい。

## 整形(手動で位置を揃えなくてよい)

型・属性の位置揃えは手動で行わず、`prisma format` コマンド(`docs/guides/prisma/cli.md`参照)に
任せる。フィールドを追加・削除するたびに実行すれば、自動で列が揃う。
