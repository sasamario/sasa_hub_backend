# fetch APIについて(汎用知識)

外部APIをNode標準の`fetch`で呼び出す際の知識をまとめる。本プロジェクトでは
`GithubApiService`などから、GitHub/Qiitaの外部APIを呼び出す際に使う。

## `interface`は実行時のフィルターではない(前提知識)

`fetch`のレスポンスに型を付ける前に、前提として知っておくべきこと。

TypeScriptの型(`interface`など)は**コンパイル時にだけ存在し、実行時には消える**
(型消去/Type Erasure)。

```typescript
// TypeScript
interface GithubCommit {
  sha: string;
}
function printSha(commit: GithubCommit) {
  console.log(commit.sha);
}
```

```javascript
// コンパイル後のJavaScript(interfaceは跡形もなく消える)
function printSha(commit) {
  console.log(commit.sha);
}
```

つまり、実際のレスポンスJSONに`sha`や`html_url`以外の大量のフィールドが含まれていても、
**それらは削除されずそのままメモリ上に残る**。`interface`は「このコード上で扱ってよい範囲を
絞り込む窓」であって、データそのものを加工・削減する仕組みではない。よって、レスポンスから
型で指定した項目だけをループで取り出す、といった処理は不要(型を付けるだけでよい)。

補足: この性質上、実行時に本当に型通りのデータが来ているかはTypeScriptはチェックしてくれない。
外部から来るデータを実行時にも検証したい場合は`zod`のようなライブラリを使う(本プロジェクトでは
未導入)。

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
