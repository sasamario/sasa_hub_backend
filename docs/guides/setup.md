# 初回セットアップ手順

本プロジェクト(sasa_hub_backend)を最初にセットアップした際の手順の記録。
NestJS CLI自体の汎用知識は `docs/guides/nestjs/cli.md` を参照。

## 1. NestJS CLIの動作確認

```
npx @nestjs/cli --version
```

グローバルインストールはせず、都度 `npx` で実行する方針とした
(PCを汚さない代わりに、実行のたびにダウンロード確認が入る)。

## 2. プロジェクトの雛形作成

```
npx @nestjs/cli new . --package-manager npm --skip-git --skip-install
```

- `new .`: 既存のgitリポジトリ(カレントディレクトリ)に直接雛形を展開する
- `--package-manager npm`: フロントエンド(`sasa_hub_frontend`)と同じくnpmを使用
- `--skip-git`: 既にgit管理下のため、CLIによる `git init` をスキップ
- `--skip-install`: 依存パッケージのインストールは行わず、まずファイル生成のみ行う

生成されたファイル構成の詳細は `docs/guides/nestjs/cli.md` を参照。

### 注意点: `.gitignore` が生成されない

`--skip-git` を指定すると、通常 `nest new` が自動生成する `.gitignore` も生成されない
(git初期化処理と紐づいているため)。今回は手動で `.gitignore` を用意した
(`node_modules` / `dist` / `.env` 等を除外)。

既存リポジトリにNestJSを導入する場合は、雛形生成後に **`.gitignore` の有無を必ず確認する**。

## 3. 依存パッケージのインストール

```
npm install
```

`node_modules` が生成される。`.gitignore` 設定済みのため `git status` で追跡対象に
含まれないことを確認する。

## トラブルシューティング: ウイルス対策ソフトによる誤検知

`npm install` 後、ウイルス対策ソフト(ウイルスバスター等)が `node_modules` 配下の
特定パッケージを検知・ブロックすることがある。

### 発生した事例: `side-channel` パッケージ

- **検知内容**: `node_modules/side-channel` がウイルスバスターにブロックされた。
- **調査方法**:
  1. `npm audit` を実行し、既知の脆弱性が0件であることを確認。
  2. `npm ls side-channel` で依存経路を確認したところ、
     `express`(正確には `qs` 経由)からの正規の依存であることが判明。
  3. `side-channel` は npm の著名メンテナー(`ljharb`)が公開する広く使われているユーティリティ
     パッケージで、"サイドチャネル攻撃" とは無関係(WeakMapが使えない値のキー管理用ヘルパー)。
- **結論**: パッケージ名に "side-channel" という文字列が含まれることによる
  **誤検知(ヒューリスティック検知の名前マッチ)** と判断した。

### 同様の誤検知が起きた場合の対応手順

1. **`npm audit` で既知の脆弱性が無いか確認する。**
2. **`npm ls <パッケージ名>` で依存経路を確認し、正規の依存(見覚えのあるライブラリ経由)か
   確認する。** 身に覚えのない経路から来ている場合は要注意。
3. **`npm view <パッケージ名>` でメタ情報(メンテナー・リポジトリURL・公開日)を確認する。**
   公式npmレジストリ上の正規パッケージかを確認する。
4. **`package-lock.json` の該当パッケージの `resolved` URLが
   `https://registry.npmjs.org/...` であることを確認する。**(改ざん・野良レジストリでないか)
5. 上記で問題が無いと判断できれば、誤検知として**ウイルス対策ソフト側で除外設定**する
   (最終判断はセキュリティポリシーに従う)。
6. 少しでも不審な点があれば安易に除外せず、パッケージを使うライブラリ自体の見直しを検討する。

## 4. Docker開発環境の構築

フロントエンド(`sasa_hub_frontend`)の `Dockerfile` / `compose.yml` と同じ流儀に揃えた。
`docker compose` の変数展開の仕組みは `docs/guides/docker/compose-env.md` を参照。

### 用意したファイル

- `Dockerfile`: `node:22` ベース(フロントと統一)。`WORKDIR /app` のみのシンプルな内容。
  依存インストールやコマンド実行は `compose.yml` 側で行う(ローカル開発用途のため)。
- `compose.yml`: 3サービス構成。
  - `app`: NestJS本体。ホスト側の公開ポートは **3001**(フロントのNuxtが3000を使っているため、
    同時起動時の衝突を避けるためにずらした)。`command: npm run start:dev` でホットリロード起動。
  - `db`: `postgres:16`。データは名前付きボリューム `db_data` に永続化。
  - `pgadmin`: `dpage/pgadmin4`。DBを操作するGUIクライアントとして追加。ホスト側ポートは5050。
- `.env.example`: 必要な環境変数の雛形をリポジトリに含める。実際の値を入れた `.env` は
  `.gitignore` 済みのためコミットしない(オーナー側で用意)。

### 環境変数の設計

| 変数名                                            | 用途                                                    |
| --------------------------------------------------- | --------------------------------------------------------- |
| `PORT`                                              | NestJSアプリの待受ポート(`main.ts` が `process.env.PORT` を参照) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `db` サービス(PostgreSQL)の認証情報                     |
| `DATABASE_URL`                                      | Prismaが参照する接続文字列。ホスト名はcompose上のサービス名 `db` を指定 |
| `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`  | pgAdminのログイン情報                                    |

### 起動確認

```
docker compose up
```

- `app`: http://localhost:3001 で応答すればOK
- `pgadmin`: http://localhost:5050 にアクセスし、`.env` に設定したメール/パスワードでログインできればOK
  (DBサーバー自体をpgAdmin上に登録する作業は別途必要。ホスト名は `db`、ポートは `5432`)

## 5. Prismaの導入

Prisma CLI・関連パッケージの汎用知識は `docs/guides/prisma/cli.md` を参照。
ここでは本プロジェクトで実際に行った手順のみ記録する。

### 5.1 パッケージのインストール

Prisma 7時点の公式ドキュメント(自前ホストPostgreSQL向けQuickstart)に沿って、
開発依存・本番依存をまとめてインストールする。各パッケージの役割は `docs/guides/prisma/cli.md` を参照。

```bash
docker compose exec app npm install -D prisma @types/pg
docker compose exec app npm install @prisma/client pg @prisma/adapter-pg dotenv
```

Prisma CLIの操作は、ローカルPC(Node v20.16.0)ではなく **appコンテナ内(node:22)** で行う方針とした。
理由: `DATABASE_URL` のホスト名を `db`(compose上のサービス名)のまま使い回せるため。
ホスト側で直接実行する場合は `localhost` 向けの別の接続文字列が必要になり、管理が煩雑になる。

**注記(判断の訂正)**: 当初「`pg` や `@prisma/adapter-pg` はサーバーレス向けの発展的機能で
不要」と判断していたが、これは誤りだった。Prisma 7では自前ホストのPostgreSQLでも
**Driver Adapter方式が標準の案内**になっている。詳細は `docs/guides/prisma/cli.md` を参照。

### 5.2 スキーマファイルの初期化

```bash
docker compose exec app npx prisma init --datasource-provider postgresql
```

`prisma/schema.prisma`(スキーマ定義)・`prisma.config.ts`(CLI設定)が生成される。
`.env` は既存のものをそのまま使うため上書きされない。

### 5.3 AIエージェント向けスキルファイルの副産物(要注意)

`prisma init` 実行時に、Prisma公式が提供する「AIコーディングアシスタント向け参考資料」が
自動でダウンロード・配置される(Prisma CLIの新機能)。詳細・対処は
`docs/guides/prisma/cli.md` の「AIエージェント向けスキル機能」を参照。

- 使っているツール(Claude Code)向けの `.claude/skills/` と、対応する `skills-lock.json` は残した。
- 使っていないツール向けの `.windsurf/` `.agents/` は削除した
  (`prisma`関連コマンド実行時に復活する可能性はあるが、実害はないため都度対応する方針)。
