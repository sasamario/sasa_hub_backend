# fetch APIの使い方(汎用知識)

`fetch`で実際にリクエストを組み立てる際の書き方をまとめる。仕組み・考え方(2段階await・
`axios`との違い)は`docs/guides/typescript/fetch-concepts.md`を参照。

## HTTPメソッドの指定

第2引数のオプションオブジェクトで指定する。

```typescript
// GET(method省略時のデフォルト)
const response = await fetch(url);
// 上と同じ意味
const response = await fetch(url, { method: 'GET' });

// POST
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ foo: 'bar' }),
});
```

- `method`を省略すると自動的に`GET`になる。データを取得するだけの処理では書かなくてよい
- `PUT` / `DELETE`なども同様に`method`で指定する

## POSTなどでリクエスト本文(body)を送る場合

- `body`に送りたいデータを渡す。JSONを送るなら`JSON.stringify(...)`で文字列化する
- `headers`に`'Content-Type': 'application/json'`を明示する(無いとサーバー側が
  「これはJSONだ」と正しく解釈できないことがある)

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ foo: 'bar' }),
});
```

## クエリパラメータの付け方: `URLSearchParams`

クエリパラメータ(`?state=all&sort=updated`のような部分)を組み立てる際は、文字列結合ではなく
`URLSearchParams`(Web標準のクラス)を使うのが定番。

```typescript
const params = new URLSearchParams({
  state: 'all',
  sort: 'updated',
  direction: 'desc',
});
const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/pulls?${params}`;
const response = await fetch(url);
```

- オブジェクトを渡すと`key=value`形式に自動で変換される
- **URLエンコード(記号や日本語などを安全な文字列に変換する処理)も自動でやってくれる**のが利点
- テンプレートリテラルに`${params}`と埋め込むと、`toString()`が自動で呼ばれてクエリ文字列になる
- パラメータを増やしたい場合は、渡すオブジェクトにキーを追加するだけでよい

固定の1パラメータだけなど単純な場合は`` `${url}?state=all` ``のような文字列結合でも動作するが、
値に特殊文字が混ざる可能性がある場合や、パラメータが複数になる場合は`URLSearchParams`の方が
安全で読みやすい。
