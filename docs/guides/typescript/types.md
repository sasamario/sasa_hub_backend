# TypeScriptの型定義(汎用知識)

`interface`・`type`の使い方や、型の命名規則についてまとめる。

## `interface`とは

**オブジェクトが「どんなプロパティを持ち、それぞれ何の型か」という形(契約)を定義する**ための、
TypeScript独自の型システムの機能。JavaScript自体には存在しない。

```typescript
interface GithubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string };
  };
}
```

こう定義すると、「`GithubCommit`型の値は必ず`sha`という文字列プロパティを持つ」といったことを
TypeScriptがチェックしてくれる。外部APIから返ってくるJSONのような「決まった形を持つデータ」を
扱う際の定番の使い方。

## `interface`は実行時のフィルターではない(型消去)

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

つまり、実際のレスポンスJSONに`sha`以外の大量のフィールドが含まれていても、**それらは削除されず
そのままメモリ上に残る**。`interface`は「このコード上で扱ってよい範囲を絞り込む窓」であって、
データそのものを加工・削減する仕組みではない。よって、レスポンスから型で指定した項目だけを
ループで取り出す、といった処理は不要(型を付けるだけでよい)。

補足: この性質上、実行時に本当に型通りのデータが来ているかはTypeScriptはチェックしてくれない。
外部から来るデータを実行時にも検証したい場合は`zod`のようなライブラリを使う(本プロジェクトでは
未導入)。

## `interface` と `type`(型エイリアス)の違い・使い分け

どちらも「型に名前を付ける」機能で、**オブジェクトの形を定義するだけなら、ほぼ同じことができる**。

```typescript
interface GithubCommit {
  sha: string;
}

type GithubCommit = {
  sha: string;
};
```

慣習として:

- **オブジェクトの形**を定義したいとき → `interface`
- **複数の型の組み合わせ**(ユニオン型など、`interface`では表現できないもの)を定義したいとき → `type`

```typescript
// interfaceでは書けない例。typeを使う
type SyncStatus = 'success' | 'failed';
type Id = string | number;
```

外部APIのレスポンス型のような「オブジェクトの形」を表す場面では、基本的に`interface`を使う。

## 型の命名規則: 単数形で定義し、配列は`T[]`で表現する

型名(interface名)は、そのデータ**1件分**が「何であるか」を表す**単数形**にする。
「複数ある」ことは型名に含めず、**配列の型(`T[]`)で表現する**。

```typescript
interface GithubCommit {
  /* ... */
}

// 「リストである」ことは呼び出し側の配列型で表現する。GithubCommits のような型は作らない
async listCommits(): Promise<GithubCommit[]> {
  /* ... */
}
```

- ❌ `GithubListCommit` / `GithubCommits`(複数を型名に含めてしまっている)
- ✅ `GithubCommit`(単数)+ `GithubCommit[]`(呼び出し側で配列として扱う)

これはTypeScript全般でよく使われる考え方(例: `User`という型があり、複数のユーザーを扱う変数は
`User[]`と書く。`Users`という型を別途作ったりはしない)。

## `as`(型アサーション)と型注釈の違い

値に型を付ける方法として、`as`と変数宣言時の型注釈の2種類がある。**この2つは別の仕組み**であり、
今回のように片方の型が`any`のときだけ、結果的に同じ挙動になる。

```typescript
const commits1 = (await response.json()) as GithubCommit[]; // 型アサーション
const commits2: GithubCommit[] = await response.json();     // 型注釈
```

- **型アサーション(`as`)**: 「これは指定した型だと**信じてください**」とTypeScriptに強制的に
  思い込ませる書き方。
- **型注釈(`: 型`)**: 変数を宣言する際に型を明示し、「右辺の値が本当にこの型として代入できるか
  **チェックして**」と頼む書き方。

### なぜ`response.json()`だと同じ結果になるか

`fetch`の`response.json()`の戻り値は**`any`型**(中身がJSONである以上、実行前にどんな形か
分からないため)。`any`型は「チェックを完全にすり抜けて、どんな型にでもなれる」特殊な型なので、
`as`で変換しても、型注釈で代入しても、どちらもチェックを素通りして同じ結果になる。

### 普通の型同士では挙動が変わる(参考)

```typescript
const x: number = "hello"; // ❌ 型注釈: エラー(stringはnumberに代入できない)
const y = "hello" as number; // ❌ これもエラー(全く関係ない型への変換は弾かれる)
```

`any`が絡まない場面では、型注釈は「代入できるかどうか」を厳密にチェックする一方、`as`は
ある程度「関連性がある」型同士であればチェックをすり抜けやすい、という違いがある。

### 使い分けの目安

`response.json()`のように「`any`を受け取って型を付ける」場面では、一般的に**変数宣言側で型注釈
する方が読みやすい**とされることが多い(`as`は「本来の型を上書きする」というニュアンスが強く、
乱用すると危険なコードのサインとして扱われがちなため)。

```typescript
const commits: GithubCommit[] = await response.json(); // ← こちらを推奨
```

## ファイルの置き場所(本プロジェクトでの方針)

- **単一の、はっきりした役割を持つinterface**(例: サービス間の契約) →
  `nest g interface`で生成し、`*.interface.ts`という単独ファイルにする
- **関連する複数の型をまとめて置く場所**(例: 外部APIのレスポンス型一式) →
  手動で`*.types.ts`ファイルを作り、複数の`interface`をまとめて書く

詳細は`docs/guides/nestjs/cli.md`の「`nest g interface`と、手動で作る`*.types.ts`の使い分け」を参照。
