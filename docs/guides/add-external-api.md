# 外部API連携を追加する手順

新しい外部API(GitHub/Qiitaのような)との連携を追加する際の、汎用的な作業の流れ。
GitHub連携・Qiita連携を実装した際の実例をもとにまとめている。

## 1. 公式ドキュメントを調査する

- 使う予定のエンドポイント(パス・パラメータ・レスポンスの主なフィールド)を確認する
- **認証の要否**(未認証で使えるか、トークンが必須か)を確認する
- **レート制限**を確認する
- **ページングの方式**(`per_page`/`page`のようなオフセット方式か、カーソル方式か)を確認する
- **差分取得(日時フィルタ)ができるか**を確認する。できない場合、`sort`/`direction`で
  並べ替えて、アプリ側で打ち切る形になる(`docs/guides/github/rest-api.md`のPR一覧の例を参照)
- ドキュメントの記載を鵜呑みにせず、**実際にcurlで叩いて検証する**とよい
  (Qiitaの例: ドキュメント上は一覧APIのレスポンスに`page_views_count`が含まれると読めたが、
  実際には認証の有無で挙動が違った。ドキュメントとAPIバージョンの整合性にも注意する)
- 調べた内容は `docs/guides/<APIの名前>/rest-api.md` にまとめる
  (`docs/guides/github/rest-api.md` / `docs/guides/qiita/rest-api.md` 参照)

## 2. `.env`に必要な設定を追加する

- アクセストークンなど、認証に必要な値を追加する
- 未認証で足りる場合は無理に追加しない(GitHubは未認証運用にした経緯を
  `docs/guides/setup.md`参照)
- 使わなくなった環境変数は放置せず削除する

## 3. モジュール・サービスをコマンドで生成する

```bash
docker compose exec app npx nest g module <api名>
docker compose exec app npx nest g service <api名>/<api名>-api --flat
docker compose exec app npx nest g service <api名>/<api名>-sync --flat
```

- `<api名>ApiService`: 外部APIを実際に呼び出すだけの役割
- `<api名>SyncService`: 取得したデータをDBに保存する・同期の進め方を司る役割
- 生成後、`<api名>.module.ts`に`exports`を追加するのを忘れない
  (`@Global()`なモジュールを経由しない限り、他のモジュールから使うには`exports`が必須。
  `docs/guides/prisma/nestjs-integration.md`参照)

## 4. レスポンスの型を定義する

- `<api名>-api.types.ts`に、必要なフィールドだけを持つ`interface`を定義する
  (単数形で命名する。`docs/guides/typescript/types.md`参照)

## 5. `<api名>ApiService`にAPI呼び出しメソッドを実装する

- `fetch`を使う(`docs/guides/typescript/fetch-usage.md` / `fetch-concepts.md`参照)
- ページングが必要な場合、「返ってきた件数が`per_page`未満になったら最後のページ」という
  判定でループする。**`page`のインクリメントを忘れずに**(無限ループの原因になりやすい)
- 認証が必要な場合、トークンは`headers`に入れる(URLのクエリパラメータに入れない。
  ログや履歴に残りやすいため)
- 差分取得が必要な場合、`since`のような引数を用意する(サーバー側でフィルタできない場合は、
  取得したデータをループしながらアプリ側で打ち切る)

## 6. `<api名>SyncService`に保存処理を実装する

- 追加のみでよいデータ(不変なもの。GitHubのコミットなど) →
  `createMany` + `skipDuplicates: true`
- 後から内容が変わりうるデータ(GitHubのPR、Qiitaの記事など) →
  `upsert`をループで呼ぶ(`upsertMany`は存在しないため。`docs/guides/prisma/schema.md`の
  「複合ユニークキーを`where`で指定する方法」も参照)
- 外部APIへの取得(`fetch`)はトランザクションの外で先に済ませ、DB保存だけを
  `$transaction`に乗せる(`docs/guides/prisma/transactions.md`参照)

## 7. 同期ログ(`sync_logs`)を記録する

- 呼び出し元のメソッド(1回の同期試行をまとめる単位)の中で、`try-catch`で全体を囲む
- 開始時刻を`try`の前に変数として保持しておく
- 成功したら`status: 'success'`、失敗したら`status: 'failed'`で`syncLog.create`する
  (`message`には成功時も件数などの情報を入れておくと、後から見返す際に有用)
- `catch`の中でエラーを握りつぶさず、`throw error`で投げ直す(呼び出し元が失敗を検知できる
  ようにするため。`docs/guides/typescript/error-handling.md`参照)

## 8. 動作確認用エンドポイントを用意する

- `AppService`/`AppController`に一時的なテスト用メソッド・エンドポイントを追加して、
  実際にDBへ保存されるか確認する
- 確認が済んでも、正式なAPI実装(フェーズ4)ができるまでは残しておいてよい

## 9. `docs/tasks.md`を更新する

該当タスクにチェックを入れる。実装中に設計変更や新たな発見があれば、メモ欄に記録し、
architecture.mdへの反映が必要なものはオーナー経由で伝える。
