# docker composeにおける環境変数の扱い(汎用知識)

`compose.yml` を書く際に混同しやすい、2種類の「環境変数の仕組み」を整理する。

参考: [Docker公式 - Environment variables in Compose](https://docs.docker.com/compose/how-tos/environment-variables/)

## 1. `${VAR}` によるcompose.yml自体の変数展開

`compose.yml` の中に `${POSTGRES_USER}` のように書くと、Docker Composeが
`compose.yml` を**解釈する前処理の段階**で、その部分を実際の値に置き換える。

- 値の取得元(優先度が高い順):
  1. シェルの環境変数
  2. `compose.yml` と同じディレクトリにある `.env` ファイル
     (`docker compose` コマンドを実行する際、明示的な指定なしでも自動的に読み込まれる)
- この展開は **compose.ymlをパースする段階の話であり、コンテナ内部のプロセスとは無関係**。
  各サービスに `env_file` を書いていなくても展開される。

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER} # ← ここは.envから展開されるだけ
```

## 2. `env_file` によるコンテナ内プロセスへの環境変数注入

サービス定義に `env_file: - .env` と書くと、指定したファイルの中身が
**そのコンテナ内で動くプロセスの環境変数**として渡される。

- コンテナ内のアプリケーション(Node.jsなど)が `process.env.XXX` のように読み取れるようにするための設定。
- `compose.yml` 自体の `${VAR}` 展開とは別物(展開のために `env_file` は不要)。

```yaml
services:
  app:
    build: .
    env_file:
      - .env # ← コンテナ内のNode.jsプロセスがprocess.env.PORT等を読めるようにする
```

## まとめ

| したいこと                                            | 必要な設定                                    |
| ------------------------------------------------------- | ------------------------------------------------ |
| `compose.yml` 内で `${VAR}` を使いたい                 | 同じディレクトリに `.env` を置くだけでよい(自動読込) |
| コンテナ内のアプリから `process.env.VAR` 等で読みたい | そのサービスに `env_file:` を明記する           |

`environment:` に `${VAR}` 展開済みの値を直接書いているサービス(例: `db`, `pgadmin`)は、
それだけでコンテナに値が渡るため `env_file` は不要。一方 `app` のようにアプリケーションコード側で
`process.env` を直接参照する場合は `env_file` が必要になる。
