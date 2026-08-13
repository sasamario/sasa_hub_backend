# fetch APIの仕組み・考え方(汎用知識)

`fetch`が内部的にどう動くか、`axios`とどう違うかをまとめる。実践的な使い方(HTTPメソッドの指定・
クエリパラメータなど)は`docs/guides/typescript/fetch-usage.md`を参照。

## `fetch`は2段階のawaitが必要

```typescript
const response = await fetch(url);      // ① レスポンスのヘッダー・ステータスが返るまで待つ
const commits: GithubCommit[] = await response.json(); // ② 本文を全部受信しJSONに解析するまで待つ
```

- **① `fetch(url)`**: レスポンスの**ヘッダー・ステータスコードが返ってきた時点**でPromiseが
  解決する。この時点では本文(ボディ)がまだ全部届いていない可能性がある(ストリーミングで
  少しずつ届く)。
- **② `response.json()`**: まだ受信中かもしれない本文を最後まで読み切り、JSONとして解析する、
  それ自体が時間のかかる別の非同期処理。そのためこれ自体もPromiseを返す。

### なぜ2段階に分かれているか

あえて2段階にすることで、ステータスコードがエラーの場合に本文を読まず早期リターンする、
といった効率的な書き方ができる。

```typescript
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`GitHub API error: ${response.status}`);
}
const commits: GithubCommit[] = await response.json(); // ステータスが正常な時だけ本文を読む
```

## `axios`との違い

`axios`(別のHTTPクライアントライブラリ)は`fetch`と設計思想が異なり、**1回のawaitで済む**。

```typescript
const response = await axios.get(url); // awaitは1回だけ
const commits = response.data;          // awaitなし。既に中身が入っている
```

| | `fetch` | `axios` |
|---|---|---|
| 通信部分 | ヘッダー到着時点で1つ目のPromiseが解決(本文はまだ) | 本文まで全部受信してからPromiseが解決 |
| 本文の取得 | `.json()`という別のPromiseを自分で呼ぶ必要がある | `.data`に自動でパース済みの値が入っている(await不要) |
| 設計思想 | Web標準API。大きなファイルを少しずつ受信する等、高度な使い方にも対応できる低レベルな設計 | 利便性重視。細かい制御は`fetch`ほど自由にはできない |

本プロジェクトでは、追加パッケージが不要な点・GitHub/Qiita両方で同じ書き方を使い回せる点から
`fetch`を採用している(判断の経緯は`docs/guides/github/rest-api.md`参照)。
