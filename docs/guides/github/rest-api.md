# GitHub REST API(汎用知識)

本プロジェクトのGitHub同期処理で使う予定のGitHub REST APIについてまとめる。
参照するドキュメントのAPIバージョンは執筆時点の最新である `2026-03-10` を明記している
(バージョン指定なしのリクエストは `2022-11-28` がデフォルトで使われる点に注意。
2つのバージョンで本ページの内容に実質的な差異は無いことを確認済み)。

## コミット一覧: List commits

参照: [GitHub公式ドキュメント - List commits](https://docs.github.com/en/rest/commits/commits?apiVersion=2026-03-10#list-commits)

### エンドポイント

```
GET /repos/{owner}/{repo}/commits
```

### 認証

未認証でも公開リポジトリのデータは取得できる(参照:
[Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10))。

APIリファレンスページには「Authorization: Bearer <TOKEN>」の使い方が定型文として載っているが、
これは「認証したい場合の使い方」であり必須ではない。

### レート制限

- 未認証: **60リクエスト/時間**(IPアドレス単位)
- 認証あり: 5,000リクエスト/時間

参照: [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10)

#### レート制限関連のレスポンスヘッダー

`curl -i`(ヘッダー表示)で確認できる。`GET /rate_limit`を別途呼ばなくても、
通常のAPIレスポンスのヘッダーから毎回の残り回数を把握できる。

| ヘッダー名 | 意味 |
|---|---|
| `x-ratelimit-limit` | 1時間あたりに実行できるリクエストの上限数 |
| `x-ratelimit-remaining` | 現在のウィンドウ内で残っているリクエスト数 |
| `x-ratelimit-used` | 現在のウィンドウ内で既に消費したリクエスト数 |
| `x-ratelimit-reset` | レート制限がリセットされる時刻(UTC epoch秒。UNIXタイムスタンプ形式) |

### パラメータ一覧

| パラメータ名 | 型 | 詳細 | 例 |
|---|---|---|---|
| `sha` | string | ブランチ名 or コミットSHA。指定した地点から遡って取得する | `main`, `a1b2c3d` |
| `path` | string | このファイルパスに変更を加えたコミットのみに絞り込む | `src/app.module.ts` |
| `author` | string | コミット作成者(GitHubユーザー名 or メールアドレス)で絞り込む | `sasamario` |
| `since` | string(ISO 8601) | この日時**以降**のコミットのみ取得する | `2026-01-01T00:00:00Z` |
| `until` | string(ISO 8601) | この日時**より前**のコミットのみ取得する | `2026-02-01T00:00:00Z` |
| `per_page` | integer | 1ページあたりの取得件数(デフォルト30、最大100) | `100` |
| `page` | integer | ページ番号(デフォルト1) | `2` |

**注意**: Gitの制約上、`since`/`until`に指定できる日時は`1970-01-01`〜`2099-12-31`の範囲内。

### レスポンスの主なフィールド

```json
[
  {
    "sha": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "html_url": "https://github.com/sasamario/sasa_tools/commit/xxxxxxx",
    "commit": {
      "author": {
        "name": "sasamario",
        "date": "2026-08-01T16:00:49Z"
      },
      "message": "READMEを更新"
    }
  }
]
```

- `sha`: コミットSHA(`github_activities.external_id`に対応する想定)
- `html_url`: GitHub上のコミットページURL(`github_activities.url`に対応する想定)
- `commit.message`: コミットメッセージ(`github_activities.title`に対応する想定)
- `commit.author.date`: コミット日時(`github_activities.activity_date`に対応する想定)

### curl実行例

```bash
# 2026年1月1日以降のコミットを、最新5件だけ取得する
curl -s "https://api.github.com/repos/sasamario/sasa_tools/commits?since=2026-01-01T00:00:00Z&per_page=5"
```

```bash
# レスポンスヘッダも見たい場合(レート制限の残り回数などが確認できる)
curl -si "https://api.github.com/repos/sasamario/sasa_tools/commits?per_page=1"
```

## PR一覧: List pull requests

参照: [GitHub公式ドキュメント - List pull requests](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2026-03-10#list-pull-requests)

### エンドポイント

```
GET /repos/{owner}/{repo}/pulls
```

### 認証・レート制限

コミット一覧と同様(未認証で公開リポジトリのデータ取得可、60リクエスト/時間)。

### ⚠️ 日時での絞り込みパラメータが存在しない

コミット一覧にあった`since`/`until`に相当するパラメータが**PR一覧には無い**。
`sort=updated&direction=desc`で並べ替え、アプリ側で`updated_at`を見て
「前回同期時点より古くなったら取得を打ち切る」という実装上の工夫が必要になる
(architecture.md 7.1の差分取得を実装する際に検討する)。

### パラメータ一覧

| パラメータ名 | 型 | 詳細 | 例 |
|---|---|---|---|
| `state` | string | `open` / `closed` / `all`。**デフォルトは`open`のみ**なので、マージ済み/クローズ済みも取得するには明示的に指定が必要 | `all` |
| `head` | string | `ユーザー名:ブランチ名`形式でheadブランチを絞り込む | `sasamario:feature-x` |
| `base` | string | ベースブランチ名で絞り込む | `main` |
| `sort` | string | `created`(デフォルト) / `updated` / `popularity` / `long-running` | `updated` |
| `direction` | string | `asc` / `desc` | `desc` |
| `per_page` | integer | 1ページあたりの取得件数(デフォルト30、最大100) | `100` |
| `page` | integer | ページ番号(デフォルト1) | `2` |

### レスポンスの主なフィールド

```json
[
  {
    "number": 1,
    "state": "closed",
    "title": "READMEを更新",
    "html_url": "https://github.com/sasamario/sasa_tools/pull/1",
    "created_at": "2026-08-01T10:00:00Z",
    "updated_at": "2026-08-02T09:00:00Z",
    "closed_at": "2026-08-02T09:00:00Z",
    "merged_at": "2026-08-02T09:00:00Z"
  }
]
```

- `number`: PR番号(`github_activities.external_id`に対応する想定)
- `html_url`: GitHub上のPRページURL(`github_activities.url`に対応する想定)
- `title`: PRタイトル(`github_activities.title`に対応する想定)
- `merged_at`: マージ日時。**未マージの場合はnull**(`github_activities.activity_date`に対応する想定。
  architecture.md 4.1の通り、未マージPRは`activity_date`がNULLになる設計と一致する)

### curl実行例

```bash
# マージ済み・未マージ含めて全状態のPRを、更新日時の降順で5件取得する
curl -s "https://api.github.com/repos/sasamario/sasa_tools/pulls?state=all&sort=updated&direction=desc&per_page=5"
```
