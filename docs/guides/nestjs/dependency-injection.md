# NestJSのDI(依存性注入)について(汎用知識)

コンストラクタインジェクションの書き方に関する知識・本プロジェクトでの方針をまとめる。

参考: [NestJS公式ドキュメント - Providers](https://docs.nestjs.com/providers)

## コンストラクタインジェクション時は `private readonly` を付ける

```ts
@Injectable()
export class GithubService {
  constructor(private readonly prismaService: PrismaService) {}
}
```

- DIで注入される依存(サービスなど)は、コンストラクタで一度セットされたら基本的に
  再代入されることはない。`readonly` を付けることで「このプロパティは書き換えない」という
  意図をコンパイラに保証させられる(誤って `this.prismaService = ...` のように再代入しようとすると
  コンパイルエラーになる)。
- NestJSの公式CLI(`nest g controller` / `nest g service`)が生成するコードも
  `private readonly` がデフォルトであり、NestJSのエコシステムでは実質的な標準スタイル。
