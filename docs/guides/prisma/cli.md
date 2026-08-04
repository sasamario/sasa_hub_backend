# Prisma CLI・関連パッケージについて(汎用知識)

Prisma ORMの基本知識をまとめる。本プロジェクト固有の作業手順は `docs/guides/setup.md` を参照。

参考: [Prisma公式ドキュメント](https://www.prisma.io/docs) /
[Quickstart(自前ホストPostgreSQL向け)](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgresql) /
[Quickstart(Prisma Postgres向け)](https://www.prisma.io/docs/prisma-orm/quickstart/prisma-postgres)

## 主なコマンド

### `prisma init`(初期化)

```
prisma init [オプション]
```

主なオプション:

| オプション                 | 意味                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `--datasource-provider <db>` | 接続先DBの種類(`postgresql` / `mysql` / `sqlite` / `mongodb` など)。デフォルトは `postgresql` |
| `--with-model`              | サンプルモデル付きでスキーマを生成する                                |
| `--db`                       | Prisma社のクラウドDB(Prisma Postgres)を新規プロビジョニングする      |

生成されるもの:

- `prisma/schema.prisma`: モデル定義・接続設定を書くスキーマファイル
- `prisma.config.ts`: Prisma CLI自体の設定ファイル(スキーマの場所・マイグレーションの出力先など)
- (`.env` が無ければ新規作成。`DATABASE_URL` の雛形が入る)

### `prisma migrate dev`(マイグレーション)

スキーマの変更内容をもとにSQLマイグレーションファイルを生成し、開発用DBに適用する。

```
prisma migrate dev --name <変更内容を表す名前>
```

### `prisma generate`

`schema.prisma` の内容をもとに、TypeScriptの型付きクライアント(`@prisma/client`)を生成する。
スキーマを変更したら都度実行が必要(`migrate dev` は内部で自動的に呼び出す)。

### `prisma studio`

ブラウザ上でDBの中身をGUIで確認・編集できるツールを起動する。

### `prisma format`

`schema.prisma` 内の型・属性などの列を自動で位置揃えする。フィールドを追加・削除して
幅が変わっても、手動で揃え直す必要がなくなる。スキーマを編集したら都度実行するとよい。

```
prisma format
```

参考: [CLI Reference](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)

## Driver Adapter方式(Prisma 7の標準構成)

Prisma ORMのバージョンにより、DBへの接続方式が異なる。

- **旧方式(クエリエンジン)**: Prisma Client自身が持つRust製のバイナリ(クエリエンジン)が、
  直接DBと通信する。アプリ側でDBドライバー(`pg`など)を意識する必要がない。
- **Driver Adapter方式**: `pg`(node-postgres)のような、Node.jsの世界で広く使われる
  DBドライバーをPrisma Clientに直接渡して使う方式。Prisma 7では**自前ホストのPostgreSQLでも
  この方式が標準の案内**になっている(公式Quickstart参照)。

### 必要なパッケージ(PostgreSQLの場合)

公式Quickstart([自前ホストPostgreSQL向け](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgresql))より:

| パッケージ            | 種別       | 役割                                                     |
| ----------------------- | ---------- | ---------------------------------------------------------- |
| `prisma`                | 開発依存   | CLIツール本体                                             |
| `@prisma/client`        | 本番依存   | クライアントライブラリ(スキーマから型付きAPIを生成)     |
| `pg`                    | 本番依存   | node-postgres。実際にPostgreSQLと通信するドライバー本体   |
| `@prisma/adapter-pg`    | 本番依存   | `pg` と Prisma Client を繋ぐDriver Adapter                |
| `@types/pg`             | 開発依存   | `pg` のTypeScript型定義                                   |
| `dotenv`                | 本番依存   | `.env` ファイルの読み込み(`prisma.config.ts` が使用)     |

### アプリケーションコードでの使い方(参考実装)

```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

NestJSでは、これを `PrismaService`(`OnModuleInit` を実装するInjectable)にまとめて
DIコンテナに登録するのが定番の構成。具体的な実装は今後 `docs/guides/prisma/` 配下か
`docs/guides/nestjs/` 配下に追記予定。

**注意(誤りやすい点)**: 「Driver Adapterはサーバーレス/エッジ環境向けの発展的機能」という説明は
Prisma 5/6以前の情報であり、**Prisma 7では自前ホストのPostgreSQLでも標準の構成**になっている。
バージョンによって案内が変わるため、実装時は都度公式ドキュメントで現行の推奨構成を確認すること。

## AIエージェント向けスキル機能(副次的な話題)

Prisma CLI(`prisma init` など)を実行すると、Prisma公式が提供する
「AIコーディングアシスタント向けの参考資料(SKILL.md群)」が自動でダウンロードされ、
検出されたツール向けのディレクトリに配置されることがある(情報源: `prisma/skills` というGitHubリポジトリ)。

観測された例:

- `.claude/skills/`: Claude Code向け
- `.windsurf/skills/`: Windsurf向け
- `.agents/skills/`: 特定ツールに依存しない汎用の置き場所
- `skills-lock.json`: 上記でダウンロードした各スキルの内容ハッシュを記録するロックファイル
  (次回実行時に内容の更新有無を判定するためのもの)

使っていないツール向けのディレクトリ(`.windsurf/` など)は削除して問題ない。ただし
`skills-lock.json` が残っている状態で削除した場合、次回Prisma関連コマンドを実行した際に
再生成されるかどうかは未検証(内部の判定ロジックが公式ドキュメントで明文化されていないため)。
実害はない副産物なので、再生成されたらその都度削除する運用でよい。
