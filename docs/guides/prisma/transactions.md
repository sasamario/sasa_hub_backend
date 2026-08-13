# Prismaのトランザクション(汎用知識)

複数のDB操作を「全部成功する or 全部取り消す」の単位でまとめて実行するための、
Prismaのトランザクション機能についてまとめる。

参考: [Prisma公式ドキュメント - Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

## `$transaction`の2つの書き方

### 1. 配列型(シーケンシャル)

あらかじめ用意したPrismaのクエリ(まだ実行していないもの)を配列で渡す方式。

```typescript
await prisma.$transaction([
  prisma.githubActivity.createMany({ data: commitsData }),
  prisma.githubActivity.createMany({ data: pullRequestsData }),
]);
```

シンプルだが、**クエリとクエリの間に、外部APIを呼ぶなどの任意の処理を挟めない**という制約がある。
この配列型でも、コミット/ロールバックは自動で行われる(全クエリ成功でCOMMIT、1つでも失敗すれば
それまでの分も含めてROLLBACK)。2つの書き方の違いは「自動/手動」ではなく、**書ける処理の自由度**
(対話的トランザクションはクエリの間に任意の処理を挟める)である点に注意。

### 2. 対話的トランザクション(コールバック型)。本プロジェクトで採用

コールバック関数を渡す方式。関数の中で好きな処理(条件分岐、複数回のクエリなど)を書ける。

```typescript
await prisma.$transaction(async (tx) => {
  await tx.githubActivity.createMany({ data: commitsData });
  await tx.githubActivity.createMany({ data: pullRequestsData });
});
```

コールバックの引数`tx`は、トランザクション専用のクライアント(後述の`TransactionClient`)。
**トランザクション中のDB操作は、必ずこの`tx`を使って行う**(通常の`prisma`ではなく)。

## 明示的なコミット/ロールバックは不要

対話的トランザクションでは、**コールバック関数の実行結果を見て、Prismaが自動的にコミット/
ロールバックを判断する**。

- コールバック関数が最後まで正常に完了(`return`)したら → 自動的に**COMMIT**(確定)
- コールバック関数の中で何かが`throw`されたら → 自動的に**ROLLBACK**(取り消し)し、
  そのエラーを`$transaction(...)`の呼び出し元に投げ直す

生のSQLでは`BEGIN`→処理→`COMMIT`/`ROLLBACK`を自分で書く必要があるが、Prismaはこれを
「関数の正常終了/例外発生」という結果に応じて肩代わりしてくれる。

## `TransactionClient`とは

`tx`の型。定義を見ると以下のようになっている。

```typescript
export type TransactionClient = Omit<
  DefaultPrismaClient,
  runtime.ITXClientDenyList
>;
```

- `Omit<T, K>`: TypeScript標準のユーティリティ型。型`T`から、指定したプロパティ`K`を除いた型を作る
- つまり`TransactionClient`は、**通常の`PrismaClient`から、トランザクション中は使うべきでない
  メソッド(接続管理系の`$connect()`/`$disconnect()`、そして`$transaction()`自体など)を
  除いた型**
- モデルへのアクセス(`tx.githubActivity.createMany()`など)は通常通りできるが、
  トランザクションの中でさらに新しいトランザクションを開始する、といった誤った操作を
  **型のレベルで防いでいる**

## 外部API呼び出しはトランザクションの外で行う

トランザクションは、開始してから終わるまでの時間をできるだけ短くするのが原則(その間DBの
リソースを掴んだままになるため)。`fetch`のような低速・失敗しうる外部通信をトランザクションの
中に含めると、トランザクションが不必要に長引くリスクがある。

そのため本プロジェクトでは、「**取得(fetch)はトランザクションの外で先に済ませ、保存(save)
だけをトランザクションに乗せる**」という構成にしている(上記`syncRepository`の実装例の通り)。

## `PrismaService`側での型の再エクスポート

`TransactionClient`型は本来`generated/prisma/client`から取得できるが、各サービスが
`generated/`配下に直接依存するのを避けるため、`PrismaService`(`src/prisma/prisma.service.ts`)
側で再エクスポートし、他のサービスは`PrismaService`と同じ場所からimportする方針にしている。

```typescript
// src/prisma/prisma.service.ts
import { PrismaClient, Prisma } from '../../generated/prisma/client';

export type TransactionClient = Prisma.TransactionClient;
```

`generated/prisma`という生成物のパスを知っているのはプロジェクト全体で`PrismaService`周辺だけ、
という状態を保つのが狙い(生成先パスが変わっても、直す箇所を1箇所に留められる)。
