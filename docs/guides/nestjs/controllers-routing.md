# NestJSのコントローラ・ルーティングについて(汎用知識)

エンドポイントのパスがどう決まるか(グローバルプレフィックス・`@Controller`・`@Get`等)、
パラメータの受け取り方についてまとめる。

参考: [NestJS公式ドキュメント - Controllers](https://docs.nestjs.com/controllers) /
[Routing](https://docs.nestjs.com/controllers#routing)

## エンドポイントのパスは3段階の組み合わせで決まる

```
最終パス = グローバルプレフィックス + @Controller()の値 + @Get()等の値
```

### 1. グローバルプレフィックス(`main.ts`)

アプリ全体の全エンドポイントの先頭に付く固定文字列。`NestFactory.create`でアプリを
生成した後、`.listen()`の前に設定する。

```ts
// main.ts
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api'); // 全エンドポイントの先頭に /api が付くようになる
await app.listen(process.env.PORT ?? 3000);
```

本プロジェクトでは `/api/{ソース}/{対象}` という設計方針(architecture.md 6.1)のため、
`api` を設定している。

参考: [Global prefix](https://docs.nestjs.com/faq/global-prefix)

### 2. `@Controller()`(コントローラ単位のパス)

そのコントローラ配下の全エンドポイントに共通で付くパス。

```ts
@Controller('github')
export class GithubController { ... }
// → このコントローラ配下は /api/github/... になる
```

### 3. `@Get()` / `@Post()` 等(メソッド単位のパス)

HTTPメソッドとパスの残りの部分を指定する。

```ts
@Controller('github')
export class GithubController {
  @Get('summary')
  getSummary() { ... }
  // → GET /api/github/summary
}
```

引数を省略すると、コントローラのパスそのもの(`/api/github`)になる。

```ts
@Get()
findAll() { ... }
// → GET /api/github
```

参考: [HTTP methods](https://docs.nestjs.com/controllers#request-object)

## パラメータの受け取り方

### クエリパラメータ: `@Query()`

`?mode=full` のような値を受け取る。HTTPからの値は常に**文字列**(または未指定)で渡ってくる。

```ts
@Get('sync-all-repositories')
sync(@Query('mode') mode: string = 'diff') { ... }
// GET /api/sync-all-repositories?mode=full → mode = 'full'
// GET /api/sync-all-repositories            → mode = 'diff' (デフォルト値)
```

引数無しの `@Query()` で全クエリパラメータをオブジェクトとしてまとめて受け取ることもできる。

```ts
@Get('activities')
findActivities(@Query() query: { repository?: string; type?: string }) { ... }
```

### パスパラメータ: `@Param()`

`/api/github/activities/:id` のような、パスの一部として埋め込まれた値を受け取る。

```ts
@Get(':id')
findOne(@Param('id') id: string) { ... }
// GET /api/github/activities/123 → id = '123'
```

パスパラメータもクエリパラメータ同様、常に文字列として渡ってくる(数値として使うなら
`Number(id)` 等の変換が必要)。

### リクエストボディ: `@Body()`

`POST`/`PUT`等でリクエストボディを受け取る。

```ts
@Post('sync')
sync(@Body() body: SomeDto) { ... }
```

参考: [Request payloads](https://docs.nestjs.com/controllers#request-payloads)

## 本プロジェクトでの実例

`src/github/github.controller.ts`:

```ts
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('summary')
  getSummary() {
    return this.githubService.getSummary();
  }
}
```

`main.ts`で`api`をグローバルプレフィックスに設定しているため、実際にアクセスするパスは
`GET /api/github/summary` になる。
