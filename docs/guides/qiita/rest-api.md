# Qiita API v2(汎用知識)

本プロジェクトのQiita同期処理で使う予定のQiita API v2についてまとめる。

参考: [Qiita API v2ドキュメント](https://qiita.com/api/v2/docs)

## 自分の記事一覧: `GET /api/v2/authenticated_user/items`

### エンドポイント

```
GET /api/v2/authenticated_user/items
```

認証したユーザー自身の記事一覧を取得する(限定共有記事など、公開記事一覧API
(`GET /api/v2/users/:user_id/items`)には出てこないものも含めて取得できる)。

### 認証

**必須**。リクエストヘッダーに`Authorization: Bearer <アクセストークン>`を付与する。

```
Authorization: Bearer <QIITA_ACCESS_TOKEN>
```

`authenticated_user/items`は、エンドポイント名の通り「認証済みユーザー」の記事を取得する
ものなので、**認証しないとそもそも成立しない**(トークンが無ければ「誰の記事か」を
判定できない)。

補足: Qiitaには`GET /api/v2/users/:user_id/items`(特定ユーザー名を指定して公開記事を
取得する、別のエンドポイント)もあり、そちらは未認証でも動く(60リクエスト/時間)。
ただし実際に検証したところ、**未認証のこちらのエンドポイントでは`page_views_count`が
常に`null`で返ってくることを確認した**(2026-08-13)。PV数の取得が要件のため、
本プロジェクトでは認証必須の`authenticated_user/items`を採用する
(加えて限定共有記事も、こちらでないと取得できない)。

### レート制限

- 認証あり: **1,000リクエスト/時間**
- 認証なし: 60リクエスト/時間(IPアドレス単位)
- 残り回数はレスポンスヘッダーに含まれる

### パラメータ一覧

| パラメータ名 | 型 | 詳細 | 例 |
|---|---|---|---|
| `page` | integer | ページ番号(デフォルト1) | `2` |
| `per_page` | integer | 1ページあたりの取得件数(1〜100、デフォルト20) | `100` |

**注意**: GitHubのコミット一覧と違い、日時での絞り込み(`since`のようなパラメータ)は存在しない。
Qiita同期は「毎回全記事を取得してupsert」という設計(architecture.md 7.2)のため、
差分取得の概念自体が無い。

### レスポンスの主なフィールド

```json
[
  {
    "id": "xxxxxxxxxxxxxxxxxxxx",
    "title": "TypeScriptの型について",
    "url": "https://qiita.com/sasamario/items/xxxxxxxxxxxxxxxxxxxx",
    "created_at": "2026-08-01T10:00:00+09:00",
    "likes_count": 10,
    "stocks_count": 5,
    "page_views_count": 123
  }
]
```

- `id`: 記事ID(`qiita_articles.external_id`に対応する想定)
- `url`: 記事URL(`qiita_articles.url`に対応する想定)
- `title`: 記事タイトル(`qiita_articles.title`に対応する想定)
- `created_at`: 投稿日時。ISO 8601形式だが、**GitHubの`Z`表記とは違い`+00:00`という
  オフセット表記でUTCを表す**(例: `"2026-08-01T10:00:00+00:00"`)。表記は違うが、
  どちらも同じUTCを表しているため、`Date`オブジェクトに変換すれば扱いは同じになる
- `likes_count` / `stocks_count`: そのまま`qiita_articles`の対応列に使う想定
- `page_views_count`: PV数。**`null`が返ることがある**(`qiita_articles.pageViewsCount`を
  NULL許容にしている理由。個別記事取得APIを別途呼ばなくても、一覧APIのレスポンスに
  最初から含まれていることを確認済み。architecture.md執筆時(ADR-0003)の「個別取得が必要」
  という前提は誤りだったと判明した)

### curl実行例

```bash
curl -s "https://qiita.com/api/v2/authenticated_user/items?per_page=5" \
  -H "Authorization: Bearer $QIITA_ACCESS_TOKEN"
```

### ページングの考え方(GitHubと同様)

GitHubの実装と同じく、「返ってきた件数が`per_page`未満だったら最後のページ」という判定で
全ページを辿る想定(`docs/guides/github/rest-api.md`のページング実装を参照)。
