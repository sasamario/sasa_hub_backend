# NestJSにおけるバリデーション(汎用知識)

クエリパラメータ等の入力値を検証する仕組み(`class-validator` / `class-transformer` /
`ValidationPipe`)についてまとめる。`GET /api/github/commits/timeseries`の
`unit`/`from`/`to`/`repository`バリデーション導入時の議論より。

参考: [NestJS公式ドキュメント - Validation](https://docs.nestjs.com/techniques/validation) /
[class-validator](https://github.com/typestack/class-validator) /
[class-transformer](https://github.com/typestack/class-transformer)

## `class-validator`とは

クラスのプロパティに**デコレータでバリデーションルールを宣言する**ためのライブラリ。

```ts
class GetCommitsTimeseriesQueryDto {
  @IsEnum(TimeseriesUnit)
  unit: TimeseriesUnit;

  @IsOptional()
  @IsDateString()
  from?: string;
}
```

`@IsEnum()`(指定した列挙値のどれかか)、`@IsDateString()`(ISO8601形式の日付文字列か。
`YYYY-MM-DD`の日付のみの形式も含む)、`@IsOptional()`(未指定を許容する)など、
よく使う検証パターンがデコレータとして用意されている。

`class-validator`単体は、**すでに存在するクラスのインスタンス**を検証する機能でしかない。
手動でインスタンスを作れば`class-transformer`が無くても`validate()`は呼び出せる。

## `class-transformer`とは

**プレーンなオブジェクト(HTTPリクエストから届く、ただのJSON)を、実際のクラスの
インスタンスに変換する**ライブラリ。

`class-validator`のデコレータは「クラスのインスタンス」に対してのみ正しく機能するため、
この変換のステップが必要になる。

## なぜセットで使われるのか(NestJSの`ValidationPipe`)

HTTPリクエストから届く`@Query()`/`@Body()`の中身は、プレーンなオブジェクトでしかない。
NestJSの`ValidationPipe`は、この2つのライブラリを組み合わせて以下の流れを自動化する。

```
HTTPの生データ(プレーンオブジェクト)
   ↓ class-transformer(plainToInstance)でクラスのインスタンス化
DTOクラスのインスタンス
   ↓ class-validatorでデコレータ通りに検証
検証済みのデータ、またはエラー(自動でBadRequestExceptionを投げる)
```

## 導入手順

```bash
npm i --save class-validator class-transformer
```

## `useGlobalPipes`によるアプリ全体への適用

**パイプ(Pipe)**とは、コントローラのメソッドが呼ばれる直前に割り込んで、引数
(`@Query()`/`@Param()`/`@Body()`で受け取る値)を変換・検証する仕組み。`ValidationPipe`も
このパイプの一種。

パイプは以下のように適用範囲(スコープ)を選べる。

| 書き方                                   | 適用範囲                           |
| ---------------------------------------- | ---------------------------------- |
| `@Query('unit', new ParseEnumPipe(...))` | そのパラメータ1つだけ              |
| コントローラに`@UsePipes()`              | そのコントローラの全エンドポイント |
| `app.useGlobalPipes()`                   | アプリ全体の全エンドポイント       |

プロジェクト全体の方針として使っていく場合は、`main.ts`で一度だけ設定すれば、
以後作成する全てのDTOに自動的に適用される。

```ts
// main.ts
const app = await NestFactory.create(AppModule);
app.useGlobalPipes(new ValidationPipe({ transform: true }));
```

## `transform: true`が必要な理由

`ValidationPipe`は、`transform`オプションの有無に関わらず内部では検証のためにDTOインスタンスへの
変換を行っている。ただし**コントローラに何を渡すか**が変わる。

- `transform`無し: 検証はするが、コントローラには**元の生データ(プレーンオブジェクト)**が渡る
- `transform: true`: 検証に加えて、**変換済みのDTOインスタンス**(デフォルト値の適用・型変換込み)が渡る

DTOのプロパティにデフォルト値を持たせている場合(例: `unit: TimeseriesUnit = TimeseriesUnit.Week`)、
それが実際に機能するのは、コントローラに渡ってくるのが**DTOのインスタンスである場合だけ**。
`transform: true`が無いと、未指定時に`undefined`のまま渡ってきてしまい、デフォルト値が
反映されない。

またクエリパラメータは常に文字列で届くため(架空のクエリ`?count=5`の`5`も文字列の`"5"`)、
数値・真偽値等の型を持つDTOプロパティに変換するにも`transform: true`が必要。

公式ドキュメントの基本例は`transform`オプション無しの`new ValidationPipe()`だが、これは
「検証だけしたい・変換後の値は使わない」ケースの例であり、クエリパラメータのデフォルト値・
型変換を活かしたい今回のようなケースでは`transform: true`が必須と考えてよい。
