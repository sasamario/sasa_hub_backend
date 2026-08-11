# NestJS CLI について(汎用知識)

NestJS プロジェクトの作成・雛形生成を行う公式CLIツールの知識をまとめる。
本プロジェクト固有の作業手順は `docs/guides/setup.md` を参照。

参考: [NestJS公式ドキュメント - First Steps](https://docs.nestjs.com/first-steps) /
[CLI Overview](https://docs.nestjs.com/cli/overview) /
[CLI Usages](https://docs.nestjs.com/cli/usages)

## 主なコマンド

### `nest new`(プロジェクト作成)

新規プロジェクトの雛形一式(TypeScript設定・ESLint/Prettier・テスト環境込み)を生成する。

```bash
nest new <プロジェクト名>
```

主なオプション:

| オプション               | 意味                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `--package-manager <pm>` | 使用するパッケージマネージャーを指定(npm/yarn/pnpm)。未指定時は対話式で選択 |
| `--skip-git`             | `git init` を実行しない(既存リポジトリに導入する場合などに指定)           |
| `--skip-install`         | 依存パッケージの自動インストールを行わない(生成のみ)                      |
| `--directory <dir>`      | 生成先ディレクトリを指定(`.` でカレントディレクトリに直接展開)            |

公式ドキュメント: [CLI command reference](https://docs.nestjs.com/cli/usages#nest-new)

**注意**: `--skip-git` を指定すると `.gitignore` も生成されない(git初期化と紐づいた処理のため)。
既存リポジトリに導入する場合は、雛形生成後に `.gitignore` を別途用意する必要がある。

### `nest generate`(`nest g`。コード生成)

モジュール・コントローラー・サービスなどの雛形を追加生成する。

```bash
nest g module users     # モジュールを生成
nest g controller users # コントローラーを生成
nest g service users    # サービスを生成
nest g resource users   # モジュール+コントローラー+サービス+DTOをまとめて生成(CRUD雛形)
```

`resource` は生成時にトランスポート層(REST API / GraphQL / Microservice / WebSocket)を
対話式で選択できる。REST API中心の本プロジェクトでは基本的に REST を選ぶ想定。

参考: [CLI command reference - nest generate](https://docs.nestjs.com/cli/usages#nest-generate)

### `nest build` / `nest start`

```bash
nest build          # TypeScriptをコンパイルし dist/ に出力
nest start          # アプリを起動(コンパイル済みを実行)
nest start --watch  # ファイル変更を検知して自動再起動(開発時に使用)
```

## `nest new` で生成される標準ファイル構成

```text
src/
  app.controller.ts       # サンプルのコントローラー(GET / を処理)
  app.controller.spec.ts  # コントローラーのユニットテスト
  app.module.ts           # ルートモジュール(アプリ全体のエントリーポイントとなるモジュール定義)
  app.service.ts          # サンプルのサービス(ビジネスロジックを置く層)
  main.ts                 # アプリケーションの起動処理(エントリーポイント)
test/
  app.e2e-spec.ts          # E2Eテスト
  jest-e2e.json            # E2Eテスト用のJest設定
package.json               # 依存パッケージ・npm scripts定義
tsconfig.json               # TypeScriptコンパイラ設定(開発用)
tsconfig.build.json         # ビルド用のTypeScript設定(testファイル等を除外)
nest-cli.json                # Nest CLI自体の設定(ソースルート・コンパイラオプション等)
eslint.config.mjs            # ESLintの設定(Flat Config形式)
.prettierrc                  # Prettierの設定
```

### 各ファイルの役割(補足)

- **`main.ts`**: `NestFactory.create(AppModule)` でアプリケーションインスタンスを生成し、
  `.listen(port)` でHTTPサーバーを起動する。Node.jsで言う `index.js` に相当するエントリーポイント。
- **`app.module.ts`**: `@Module()` デコレーターで `imports` / `controllers` / `providers` を宣言する。
  NestJSは「モジュール」単位で機能をまとめる設計(Angularのモジュール概念に近い)。
  ルートモジュールはアプリ全体の起点となり、他の機能モジュール(例: `UsersModule`)をここに集約していく。
- **`app.controller.ts`**: HTTPリクエストを受け取りレスポンスを返す層。`@Controller()` でルートパスを、
  `@Get()` 等のデコレーターでHTTPメソッド・パスを指定する。
- **`app.service.ts`**: ビジネスロジックを担う層。コントローラーからDI(依存性注入)で呼び出される。
  `@Injectable()` を付けることでNestJSのDIコンテナに登録される。
- **`nest-cli.json`**: `nest build` / `nest start` などCLIコマンドの挙動を制御する設定ファイル
  (例: ソースディレクトリの場所、コンパイラのオプション)。

参考: [Modules](https://docs.nestjs.com/modules) /
[Controllers](https://docs.nestjs.com/controllers) /
[Providers](https://docs.nestjs.com/providers)
