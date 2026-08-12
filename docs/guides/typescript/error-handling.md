# エラーハンドリング(汎用知識)

`try-catch`・`throw`まわりの挙動と、TypeScriptでのエラーメッセージの取得方法をまとめる。

## `throw`は「catchされるまで上に伝播する」

`throw`されたエラーは、それをキャッチする`try-catch`が見つかるまで、呼び出し元をどんどん
遡っていく。どこにも`try-catch`が無ければ、プログラムの一番上まで到達する。

```typescript
function a() {
  throw new Error('エラー!');
}
function b() {
  a(); // ここではcatchしていない
}
b(); // ← ここでエラーが「未処理」として表面化する
```

素のNode.jsで未処理のまま放置すると、**Node.jsのプロセス自体がクラッシュして終了する**。
`async`関数内でのエラー(Promiseのreject)が誰にも`.catch()`されなかった場合も同様。

### NestJSでは自動的にキャッチされる

NestJSのようなWebフレームワークは、リクエスト処理全体をフレームワーク自身が用意した
`try-catch`で包んでいる。コントローラー(やそこから呼ばれるサービス)の中で例外が発生すると、
NestJSが自動的にキャッチし、プロセスをクラッシュさせる代わりに「500 Internal Server Error」
のようなHTTPレスポンスを返す。そのため、明示的に`try-catch`を書かなくても、1つのリクエストで
エラーが起きてもアプリ全体は落ちずに動き続ける。

ただし、architecture.mdの「一部のリポジトリが失敗しても、残りの同期は継続する」のような
**独自の継続ロジック**は、NestJSの自動キャッチだけでは実現できない。この場合は明示的に
`try-catch`で処理を囲み、失敗しても次の処理に進むようにする必要がある(本プロジェクトの
`GithubSyncService.syncAllRepositories`参照)。

## `catch (error)`の`error`はどんな型か

TypeScriptでは、`catch`で受け取る変数は基本的に**`unknown`型**として扱われる(TypeScript 4.4以降、
`strict`モード時のデフォルト)。`unknown`型は「何が来るか分からない」ことを表す型で、
`error.message`のように直接プロパティへアクセスすることはできない。

```typescript
} catch (error) {
  console.log(error.message); // ❌ unknown型はプロパティに直接アクセスできない
}
```

**注記**: この挙動は`tsconfig.json`の`useUnknownInCatchVariables`(`strict`モードに含まれる設定の
1つ)に依存する。本プロジェクトの`tsconfig.json`は`strict: true`を設定していないため、厳密には
`catch`変数が`unknown`として強制されない可能性がある。ただし、**JavaScriptは`Error`インスタンス
以外の値(文字列や数値など)も`throw`できてしまう**ため、コンパイラの設定に関わらず、以下の
`instanceof Error`によるチェックを行うのがよい習慣である。

### なぜ`unknown`なのか(仕組みに関わらず知っておくべき理由)

JavaScriptは`throw`する値の型を制限していない。`throw new Error(...)`だけでなく、
`throw 'エラー'`(文字列)や`throw 42`(数値)のようなことも文法上可能。そのため、`catch`した
値が必ず`Error`インスタンスである保証はどこにもない。

## エラーメッセージの安全な取得方法

`error instanceof Error`で「これは`Error`インスタンスである」と確認してから`.message`に
アクセスする。

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // messageは必ずstring型になる
}
```

- `error instanceof Error`が`true`の場合: `.message`(エラーメッセージの文字列)を使う
- `false`の場合(`Error`以外がthrowされた場合の保険): `String(error)`で無理やり文字列に変換する

## `catch`ブロックで`throw`し直す場合、戻り値の型は気にしなくてよい

関数の戻り値の型(`Promise<T>`など)は、**その関数が正常に完了(`return`)した場合に何を返すか**
を約束するもの。`throw`は、その「正常に完了する」という流れそのものを中断して別の経路に切り替える
操作なので、戻り値の型と一致しているかを気にする必要がない。

```typescript
async function syncRepository(): Promise<{ count: number }> {
  try {
    // ...
    return { count }; // ← ここは型通りの値を返す必要がある
  } catch (error) {
    // ...
    throw error; // ← ここは「型を満たす値」を用意する必要が無い。投げるだけでよい
  }
}
```

TypeScriptは`throw`の行を「この関数は正常には完了しない(`never`という特殊な型)」と解釈する。
`never`型はどんな型の代わりにも使える(矛盾しない)特別な型なので、戻り値の型チェックに
引っかからない。
