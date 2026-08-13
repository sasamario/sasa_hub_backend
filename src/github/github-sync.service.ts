import { Injectable } from '@nestjs/common';
import { GithubApiService } from './github-api.service';
import { PrismaService, TransactionClient } from '../prisma/prisma.service';
import {
  GithubCommit,
  GithubPullRequest,
  RepositoryInfo,
} from './github-api.types';

@Injectable()
export class GithubSyncService {
  constructor(
    private githubApiService: GithubApiService,
    private prismaService: PrismaService,
  ) {}

  // GitHubのコミット情報をDBに保存する処理
  async saveCommits(
    commits: GithubCommit[],
    owner: string,
    repo: string,
    tx: TransactionClient, // Prismaのトランザクションクライアントを受け取る
  ): Promise<{ count: number }> {
    const data = commits.map((commit) => ({
      // typeはGithubTypeというenum型で定義しているため、'commit'という文字列を直接指定する場合はas constを指定して固定の値として扱う必要がある
      type: 'commit' as const,
      externalId: commit.sha,
      repository: `${owner}/${repo}`,
      title: commit.commit.message,
      url: commit.html_url,
      activityDate: commit.commit.author.date,
    }));
    const result = await tx.githubActivity.createMany({
      data,
      skipDuplicates: true, // 重複をスキップするオプション
    });

    return { count: result.count };
  }

  // GitHubのプルリクエスト情報をDBに保存する処理
  async savePullRequests(
    pullRequests: GithubPullRequest[],
    owner: string,
    repo: string,
    tx: TransactionClient,
  ): Promise<{ count: number }> {
    for (const pr of pullRequests) {
      const data = {
        type: 'pull_request' as const,
        externalId: pr.number.toString(),
        repository: `${owner}/${repo}`,
        title: pr.title,
        url: pr.html_url,
        activityDate: pr.merged_at,
      };

      await tx.githubActivity.upsert({
        where: {
          type_repository_externalId: {
            type: data.type,
            repository: data.repository,
            externalId: data.externalId,
          },
        },
        create: data,
        update: data,
      });
    }

    return { count: pullRequests.length };
  }

  // 環境変数から監視対象のリポジトリ情報を取得する処理
  parseTrackedRepositories(): RepositoryInfo[] {
    const trackedRepositories =
      process.env.GITHUB_TRACKED_REPOSITORIES?.split(',');
    if (!trackedRepositories) {
      throw new Error('GITHUB_TRACKED_REPOSITORIES is not defined');
    }

    const repositoryInfo: RepositoryInfo[] = trackedRepositories.map((r) => {
      const [owner, repo] = r.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${r}`);
      }
      return { owner, repo };
    });
    return repositoryInfo;
  }

  // 監視対象のリポジトリのコミットとプルリクエストを同期する処理
  async syncRepository(
    owner: string,
    repo: string,
  ): Promise<{ commitsCount: number; pullRequestsCount: number }> {
    const startDate = new Date();
    try {
      const lastSuccessSyncedAt = await this.getLastSuccessSyncedAt(
        owner,
        repo,
      );
      const commits = await this.githubApiService.fetchCommits(
        owner,
        repo,
        lastSuccessSyncedAt,
      );
      const pullRequests = await this.githubApiService.fetchPullRequests(
        owner,
        repo,
        lastSuccessSyncedAt,
      );

      // リポジトリ単位でトランザクションを張って、同期処理を行う
      const syncResult = await this.prismaService.$transaction(async (tx) => {
        const saveCommitsResult = await this.saveCommits(
          commits,
          owner,
          repo,
          tx,
        );
        const savePullRequestsResult = await this.savePullRequests(
          pullRequests,
          owner,
          repo,
          tx,
        );

        return {
          commitsCount: saveCommitsResult.count,
          pullRequestsCount: savePullRequestsResult.count,
        };
      });

      // 同期成功ログ登録
      await this.prismaService.syncLog.create({
        data: {
          source: 'github' as const,
          repository: `${owner}/${repo}`,
          status: 'success' as const,
          startedAt: startDate,
          finishedAt: new Date(),
          message: `コミット同期(追加)件数: ${syncResult.commitsCount}件, PR同期(追加,更新)件数: ${syncResult.pullRequestsCount}件`,
        },
      });

      return syncResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 同期失敗ログ登録
      await this.prismaService.syncLog.create({
        data: {
          source: 'github' as const,
          repository: `${owner}/${repo}`,
          status: 'failed' as const,
          startedAt: startDate,
          finishedAt: new Date(),
          message: message,
        },
      });

      throw error;
    }
  }

  // 対象リポジトリ全てを同期する処理
  async syncAllRepositories(): Promise<void> {
    const repositories = this.parseTrackedRepositories();

    for (const { owner, repo } of repositories) {
      try {
        await this.syncRepository(owner, repo);
      } catch (error) {
        // リポジトリごとの同期処理で失敗しても次のリポジトリの同期処理を行う
      }
    }
  }

  // 同期ログテーブルから対象リポジトリの最新の同期ログ取得開始日時を取得
  async getLastSuccessSyncedAt(
    owner: string,
    repo: string,
  ): Promise<Date | null> {
    const log = await this.prismaService.syncLog.findFirst({
      where: {
        source: 'github',
        repository: `${owner}/${repo}`,
        status: 'success',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return log ? log.startedAt : null;
  }
}
