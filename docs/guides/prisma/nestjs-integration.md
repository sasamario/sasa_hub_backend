# PrismaをNestJSに組み込む(汎用知識)

PrismaをNestJSアプリから使うための知識をまとめる。Prisma単体のスキーマ・CLIの話は
`docs/guides/prisma/schema.md` / `docs/guides/prisma/cli.md` を参照。今後もこのプロジェクトで
組み込みに関する学びが増えたら、このファイルに追記していく。

## 全体の手順(コマンドの実行順)

### 初回セットアップ

1. **`npm install prisma @prisma/client pg @prisma/adapter-pg dotenv`**(+開発依存で`@types/pg`)
   Prisma本体・DBドライバー・Driver Adapter・`.env`読み込み用パッケージをインストールする。
2. **`npx prisma init --datasource-provider postgresql`**
   `prisma/schema.prisma`(スキーマファイル)と`prisma.config.ts`(CLI設定)を生成する。
3. **`prisma/schema.prisma`にモデル・enumを書く**
4. **`npx prisma format`**
   スキーマの型・属性の列位置を自動で整える。
5. **`npx prisma migrate dev --name <名前>`**
   マイグレーションファイルの生成・DBへの適用・`prisma generate`(クライアント生成)までをまとめて行う。
6. **`PrismaService` / `PrismaModule` を実装する**
   生成された`PrismaClient`をNestJSのDIコンテナに登録できるようにする(後述)。
7. **他のサービスから`PrismaService`をDIで注入して使う**
   `constructor(private prisma: PrismaService) {}` のように受け取って使う。

### スキーマを変更・追加する場合(2回目以降)

手順3〜5を繰り返すだけでよい(1・2・6・7はやり直し不要)。`migrate dev`が
`prisma generate`も自動実行するため、通常は生成物を手動で作り直す必要はない。

**例外**: 生成物(`generated/prisma`)がGit管理対象外のため、`git clone`直後や、
何らかの理由で生成物が存在しない/古い場合は、単体で`npx prisma generate`を実行して
明示的に作り直すことがある。

## `PrismaClient` と `PrismaService` の違い

### `PrismaClient`(Prismaが自動生成するもの)

`schema.prisma`の内容をもとに、**Prisma自身が自動生成するライブラリコード**
(`prisma generate`コマンドで生成される)。これが実際にDBと通信し、
`prisma.githubActivity.findMany()`のような型安全なメソッド群を提供する、Prismaの本体。
自分で書くコードではない。

### `PrismaService`(自分たちで書くクラス)

`PrismaClient`(Prisma本体)を、**NestJSのDIコンテナに登録するための橋渡し役**として
自分で定義するクラス。NestJSは「必要なものはコンストラクタで受け取る(DI)」という設計思想の
フレームワークなので、他のサービスから`PrismaClient`を使いたい場合、まずこの橋渡しが必要になる。

## NestJSのDI(依存性注入)とは

「あるクラスが必要とする部品(依存)を、自分でnewして用意するのではなく、外部(NestJSのDIコンテナ)
から**コンストラクタ経由で渡してもらう**」という設計パターン。

```typescript
@Injectable()
export class GithubSyncService {
  constructor(private prisma: PrismaService) {} // ← 必要な部品をコンストラクタで受け取る

  async syncCommits() {
    await this.prisma.githubActivity.findMany();
  }
}
```

- `@Injectable()`: このクラスが「DIコンテナに登録可能な部品である」ことを示すデコレーター
- コンストラクタの引数に型(`PrismaService`)を書いておくだけで、NestJSが自動的に
  対応するインスタンスを見つけて渡してくれる(自分で`new PrismaService()`する必要が無い)

## `PrismaService`の実装(Driver Adapter方式の場合)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

ポイント:

- **`extends PrismaClient`**: 継承することで、`PrismaService`のインスタンスがそのまま
  `prismaService.githubActivity.findMany()`のように、生成されたPrisma Clientの全メソッドを
  直接使えるようになる(内部にプロパティとして持たせて委譲する書き方もできるが、
  継承の方が定型的でよく使われる)。
- **`OnModuleInit`**: NestJSのライフサイクルフックの1つ。アプリ起動時に`onModuleInit()`が
  自動で呼ばれるので、そのタイミングで明示的にDB接続(`$connect()`)する。

## モジュール化(`@Global()`)

`PrismaService`を`PrismaModule`としてまとめ、`@Global()`を付けてルートモジュールで1回importして
おくと、以降どのモジュールでも改めてimportし直さずに`PrismaService`を注入できる。DBアクセスは
ほぼ全機能で必要になるため、Prisma系の定番プラクティス。
