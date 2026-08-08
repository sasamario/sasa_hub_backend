# 実装タスク(バックエンド)

本リポジトリ(NestJS バックエンド)のMVP実装タスク。
チェックリストで管理し、着手・完了時に更新する。大きなタスクは着手前にサブタスクへ分解する。

> 進め方は CLAUDE.md の「進め方の方針」に従う(一度に大量に書かず、方針を相談してから実装)。
> 設計の正本は `../sasa_hub_frontend/docs/architecture.md`。フロント実装は別リポジトリで管理する。

## フェーズ1: 環境構築

- [x] NestJS プロジェクトの初期化
- [x] Docker で開発環境を起動できるようにする(Dockerfile / compose、PostgreSQLコンテナ含む)
- [x] Prisma の導入(接続設定・初期セットアップ)
- [x] Lint / Formatter の設定(コーディング規約)
- [x] .env 設計(DB接続情報・GitHub/Qiita APIトークン・対象リポジトリ一覧など)
- [x] 初回セットアップ手順を `docs/guides/setup.md` に記録する

## フェーズ2: データモデル実装

architecture.md 4章の確定分をPrismaスキーマに落とし込む。

- [x] `github_activities` テーブル(type/external_id/repository/title/url/activity_date、
      一意制約 `(type, repository, external_id)`)
- [x] `qiita_articles` テーブル(external_id一意・likes_count/stocks_count/page_views_count・synced_at)
- [x] `sync_logs` テーブル(source/repository/status/started_at/finished_at/message)
- [x] マイグレーション作成・適用
- [x] テーブル追加の手順を `docs/guides/prisma/add-table.md` に記録する

## フェーズ3: 同期処理実装

architecture.md 7章の確定分に沿って実装する。

- [ ] GitHub同期: 対象リポジトリごとの差分取得(sync_logsのstarted_atを起点)
- [ ] GitHub同期: リポジトリ単位のトランザクション・一意キーでの重複防止
- [ ] Qiita同期: 全記事取得 + upsert(likes/stocks/page_views更新)
- [ ] Qiita同期: 記事ごとのPV個別取得・レート制限時の打ち切り処理
- [ ] 共通: 一部失敗時も残りを継続する方針の実装・sync_logsへのstatus記録
- [ ] 外部API連携を追加する手順を `docs/guides/add-external-api.md` に記録する

## フェーズ4: REST API実装

architecture.md 6章のエンドポイント一覧を実装する。

- [ ] **APIレスポンス形式の確定**(フロントとすり合わせ、architecture.md 8章に確定情報を追記)
- [ ] `GET /api/github/summary`(コミット総数・PR総数)
- [ ] `GET /api/github/commits/timeseries`(from/to/unit/repository)
- [ ] `GET /api/github/commits/by-repository`(0件リポジトリも含めて返す)
- [ ] `GET /api/github/activities`(カーソル方式ページング・repository/typeフィルタ)
- [ ] `GET /api/qiita/summary`(from/toは任意パラメータ、常時全期間呼び出しにも対応)
- [ ] `POST /api/sync/github` / `POST /api/sync/qiita` / `POST /api/sync`(一括)
- [ ] エンドポイント追加の手順を `docs/guides/add-endpoint.md` に記録する

## フェーズ5: 動作確認・フロント接続

- [ ] フロントエンドのフェーズ5(モック→本物のAPI呼び出し差し替え)と合わせて疎通確認
- [ ] CORS設定など、別リポジトリ間連携に必要な設定の確認
- [ ] 一通りの画面(ダッシュボード・GitHub詳細)で実データ表示を確認

## 保留・今後

- [ ] 手動記録(manual_records)関連API(方針未定)
- [ ] 同期ログ閲覧画面用API(拡張候補)
- [ ] Qiita詳細画面用API(MVPスコープ外)

## メモ

- 未マージPR(activity_date = NULL)は集計・一覧から除外する(ADR-0002準拠)。
- 差分取得の起点が取れない初回同期時の遡及範囲は未確定。実装着手時にオーナーと相談する。
