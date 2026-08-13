import { Injectable } from '@nestjs/common';
import { QiitaArticle } from './qiita-api.types';
import { PrismaService, TransactionClient } from '../prisma/prisma.service';
import { QiitaApiService } from './qiita-api.service';

@Injectable()
export class QiitaSyncService {
  constructor(
    private qiitaApiService: QiitaApiService,
    private prismaService: PrismaService,
  ) {}

  // 記事情報保存処理
  async saveArticles(
    articles: QiitaArticle[],
    tx: TransactionClient,
  ): Promise<{ count: number }> {
    const syncedDate = new Date();
    for (const article of articles) {
      const data = {
        externalId: article.id,
        title: article.title,
        url: article.url,
        activityDate: article.created_at,
        likesCount: article.likes_count,
        stocksCount: article.stocks_count,
        pageViewsCount: article.page_views_count,
        syncedAt: syncedDate,
      };

      await tx.qiitaArticle.upsert({
        where: {
          externalId: data.externalId,
        },
        create: data,
        update: data,
      });
    }

    return { count: articles.length };
  }

  // 記事同期処理
  async syncArticles(): Promise<{ count: number }> {
    const startDate = new Date();
    try {
      const articles = await this.qiitaApiService.fetchArticles();

      const syncResult = await this.prismaService.$transaction(async (tx) => {
        const result = await this.saveArticles(articles, tx);

        return { count: result.count };
      });

      // 同期成功ログ登録
      await this.prismaService.syncLog.create({
        data: {
          source: 'qiita' as const,
          repository: null,
          status: 'success' as const,
          startedAt: startDate,
          finishedAt: new Date(),
          message: `記事同期(追加,更新)件数: ${syncResult.count}件`,
        },
      });

      return syncResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 同期失敗ログ登録
      await this.prismaService.syncLog.create({
        data: {
          source: 'qiita' as const,
          repository: null,
          status: 'failed' as const,
          startedAt: startDate,
          finishedAt: new Date(),
          message: message,
        },
      });

      throw error;
    }
  }
}
