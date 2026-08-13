import { Injectable } from '@nestjs/common';
import { QiitaArticle } from './qiita-api.types';

const QIITA_API_BASE_URL = 'https://qiita.com/api/v2';

@Injectable()
export class QiitaApiService {
  // Qiita API(/authenticated_user/items)を呼び出して、自身の記事情報を取得する
  async fetchArticles(): Promise<QiitaArticle[]> {
    let page = 1;
    const perPage = 100;
    const allArticles: QiitaArticle[] = [];

    while (true) {
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
      });
      const url = `${QIITA_API_BASE_URL}/authenticated_user/items?${params}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.QIITA_ACCESS_TOKEN as string}`,
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch authenticated user items : ${response.statusText}`,
        );
      }
      const articles: QiitaArticle[] = await response.json();
      allArticles.push(...articles);

      if (articles.length < perPage) {
        // 取得するデータがこれ以上ないので、ループを抜ける
        break;
      }
      page++;
    }

    return allArticles;
  }
}
