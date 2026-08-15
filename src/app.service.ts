import { Injectable } from '@nestjs/common';
import { GithubSyncService } from './github/github-sync.service';
import { QiitaSyncService } from './qiita/qiita-sync.service';

@Injectable()
export class AppService {
  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly qiitaSyncService: QiitaSyncService,
  ) {}

  async syncAllRepositories(mode: string): Promise<string> {
    // 動作確認用の一時コード。GITHUB_TRACKED_REPOSITORIESに設定した全リポジトリを同期する
    await this.githubSyncService.syncAllRepositories(mode);
    return 'done';
  }

  async syncArticles(): Promise<string> {
    // 動作確認用の一時コード
    const result = await this.qiitaSyncService.syncArticles();
    return `count: ${result.count}`;
  }
}
