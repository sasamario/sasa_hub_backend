import { Injectable } from '@nestjs/common';
import { GithubApiService } from './github-api.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GithubSyncService {
  constructor(
    private githubApiService: GithubApiService,
    private prismaService: PrismaService,
  ) {}

  // GitHubのコミット情報を取得してDBに保存する処理
  async syncCommits(owner: string, repo: string): Promise<{ count: number }> {
    const commits = await this.githubApiService.fetchCommits(owner, repo);
    const data = commits.map((commit) => ({
      // typeはGithubTypeというenum型で定義しているため、'commit'という文字列を直接指定する場合はas constを指定して固定の値として扱う必要がある
      type: 'commit' as const,
      externalId: commit.sha,
      repository: `${owner}/${repo}`,
      title: commit.commit.message,
      url: commit.html_url,
      activityDate: commit.commit.author.date,
    }));
    const result = await this.prismaService.githubActivity.createMany({
      data,
      skipDuplicates: true, // 重複をスキップするオプション
    });

    return { count: result.count };
  }
}
