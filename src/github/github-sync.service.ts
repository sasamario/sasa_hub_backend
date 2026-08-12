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
    const data = pullRequests.map((pr) => ({
      type: 'pull_request' as const,
      externalId: pr.number.toString(),
      repository: `${owner}/${repo}`,
      title: pr.title,
      url: pr.html_url,
      activityDate: pr.merged_at,
    }));
    const result = await tx.githubActivity.createMany({
      data,
      skipDuplicates: true, // 重複をスキップするオプション
    });

    return { count: result.count };
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
    const commits = await this.githubApiService.fetchCommits(owner, repo);
    const pullRequests = await this.githubApiService.fetchPullRequests(
      owner,
      repo,
    );

    // リポジトリ単位でトランザクションを張って、同期処理を行う
    return this.prismaService.$transaction(async (tx) => {
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
  }

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
}
