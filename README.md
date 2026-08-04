## ローカル起動

```bash
docker compose up
```

## アクセスURL

| サービス       | URL                     |
| -------------- | ----------------------- |
| バックエンドAPI | http://localhost:3001   |
| pgAdmin        | http://localhost:5050   |

pgAdminへのログイン情報は `.env` の `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` を使用する。
