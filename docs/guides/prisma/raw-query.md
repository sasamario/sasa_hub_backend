# Prismaでの生SQL(`$queryRaw`)について(汎用知識)

`groupBy`などのクエリビルダーでは表現できない集計(例: 日付を週/月単位に丸めてグループ化)を
行う際に使う、Prismaの生SQL実行機能についてまとめる。
`GET /api/github/commits/timeseries`実装時の議論より。

参考: [Prisma公式ドキュメント - Raw queries](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries)

## `$queryRaw`と`$queryRawUnsafe`の違い

| メソッド | 値の埋め込み方 | SQLインジェクションへの安全性 |
| --- | --- | --- |
| `$queryRaw` | タグ付きテンプレートリテラル(`` `...${value}...` ``) | 安全。埋め込んだ値は自動的にプレースホルダ化される |
| `$queryRawUnsafe` | 通常の文字列(自分で組み立てる) | 危険。文字列結合の書き方次第でSQLインジェクションの余地が生まれる |

```typescript
const unit = 'week';

// 安全: $queryRaw + タグ付きテンプレートリテラル
await prisma.$queryRaw`SELECT * FROM github_activities WHERE type = ${unit}`;

// 危険: $queryRawUnsafeで文字列結合すると、値に悪意あるSQL片が混ざる余地がある
await prisma.$queryRawUnsafe(`SELECT * FROM github_activities WHERE type = '${unit}'`);
```

`$queryRaw`のテンプレートリテラル内で`${...}`を使っても、それは文字列結合ではなく
**Prismaが値を安全なプレースホルダ(バインド変数)として扱う**仕組みになっている。
そのため、基本的には`$queryRaw`を使い、`$queryRawUnsafe`は避けるべき。

## 戻り値の型は自分で明示する必要がある

`count()`や`findMany()`のような通常のPrismaメソッドは、`schema.prisma`の定義を元に
Prismaが戻り値の型を自動生成し、実際のデータもその型と一致する形で返してくれる。

一方`$queryRaw`はただの生SQLなので、Prismaは中身(どんなカラムが返るか)を解析していない。
そのため戻り値の型はジェネリクスで自分で指定する必要があり、**実行時にPrismaが
型と実データの一致を検証してくれるわけではない**(あくまで「そう信じて型を付けている」状態)。

```typescript
interface TimeseriesRow {
  period: Date;
  count: bigint;
}

const rows = await prisma.$queryRaw<TimeseriesRow[]>`
  SELECT date_trunc('week', activity_date) AS period, COUNT(*) AS count
  FROM github_activities
  GROUP BY period
`;
```

型を指定しない場合、戻り値は`unknown`型になる(`$queryRaw<T = unknown>`というジェネリクスの
デフォルト値のため)。`unknown`は「何が入っているか分からない値」を表す型で、`.map()`や
プロパティアクセスなどが一切できない。型を書かない限り実質的に結果を使えないので、
型指定は必須と考えてよい。

## `COUNT(*)`は`bigint`で返る

PostgreSQLの`COUNT(*)`は64bit整数(`bigint`)型で返る仕様になっている(理論上、JSの`number`が
正確に扱える範囲=2の53乗を超える件数にも対応できるようにするため)。これをNode.jsのDBドライバが
受け取ると、JSの`number`ではなく**`BigInt`型**として渡ってくる。

- 型注釈を`count: number`のように実態と違う形で書いてしまうと、コンパイルは通っても実行時に
  問題が起きる(`JSON.stringify()`が`BigInt`を扱えずエラーになる、`BigInt`同士でないと
  算術演算できない、など)
- 対処法: `$queryRaw`の型注釈は実態(`bigint`)に合わせて書き、**サービス側でクエリ結果を
  受け取った直後に`Number()`で変換**してから、APIとして返す形(`number`)に整える

```typescript
const rows = await prisma.$queryRaw<TimeseriesRow[]>`...`;
return rows.map((row) => ({
  period: row.period,
  count: Number(row.count), // bigint → number
}));
```

「DBから返ってきた生の型」と「このメソッドが外部に約束する型」をあえて分けて考え、
`bigint`という実装の都合をメソッドの呼び出し元に漏らさないようにする。

## `Prisma.sql`で条件付きのSQL片を組み立てる

`repository`や`from`/`to`のように、指定されている場合だけ`WHERE`条件を追加したい場合は、
`Prisma.sql`ヘルパーでSQL片を組み立ててから結合する。

```typescript
import { Prisma } from '../../generated/prisma/client';

const conditions: Prisma.Sql[] = [Prisma.sql`type = 'commit'`];
if (repository) {
  conditions.push(Prisma.sql`repository = ${repository}`);
}

const where = Prisma.join(conditions, ' AND ');

await prisma.$queryRaw`
  SELECT * FROM github_activities WHERE ${where}
`;
```

`Prisma.sql`で作った断片も、通常の`$queryRaw`のテンプレートリテラルと同様に安全に
値が埋め込まれる。文字列連結でSQL片を組み立てるのは避け、必ず`Prisma.sql`/`Prisma.join`を使う。
