import { Injectable } from '@nestjs/common';
import { GithubApiService } from './github/github-api.service';
import { GithubSyncService } from './github/github-sync.service';
import { QiitaSyncService } from './qiita/qiita-sync.service';

@Injectable()
export class AppService {
  constructor(
    private readonly githubApiService: GithubApiService,
    private readonly githubSyncService: GithubSyncService,
    private readonly qiitaSyncService: QiitaSyncService,
  ) {}

  async getHello(): Promise<string> {
    // 動作確認用の一時コード。実際の対象リポジトリで試す(owner/repoは適宜書き換えてください)
    const commits = await this.githubApiService.fetchCommits(
      'sasamario',
      'sasa_tools',
      null,
    );
    return `commits count: ${commits.length}, first: ${JSON.stringify(commits[0])}`;
  }

  async syncRepository(): Promise<string> {
    // 動作確認用の一時コード。実際の対象リポジトリで試す(owner/repoは適宜書き換えてください)
    const result = await this.githubSyncService.syncRepository(
      'sasamario',
      'sasa_tools',
    );
    return `commitsCount: ${result.commitsCount}, pullRequestsCount: ${result.pullRequestsCount}`;
  }

  async syncAllRepositories(): Promise<string> {
    // 動作確認用の一時コード。GITHUB_TRACKED_REPOSITORIESに設定した全リポジトリを同期する
    await this.githubSyncService.syncAllRepositories();
    return 'done';
  }

  async syncArticles(): Promise<string> {
    // 動作確認用の一時コード
    const result = await this.qiitaSyncService.syncArticles();
    return `count: ${result.count}`;
  }
}
