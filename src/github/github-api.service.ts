import { Injectable } from '@nestjs/common';
import { GithubCommit, GithubPullRequest } from './github-api.types';

const GITHUB_API_BASE_URL = 'https://api.github.com';

@Injectable()
export class GithubApiService {
  // GitHub API(List commits)を呼び出して、指定されたリポジトリのコミット情報を取得する
  async fetchCommits(
    owner: string,
    repo: string,
    since: Date | null,
    mode: string,
  ): Promise<GithubCommit[]> {
    let page = 1;
    const perPage = 100;
    const allCommits: GithubCommit[] = [];

    while (true) {
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
      });
      if (since && mode === 'diff') {
        params.set('since', since.toISOString());
      }
      const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits?${params}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
      }
      const commits: GithubCommit[] = await response.json();
      // ...commitsとすることで、commits配列の各要素を1つずつ、allCommitsに追加している
      allCommits.push(...commits);

      if (commits.length < perPage) {
        // 取得するデータがこれ以上ないので、ループを抜ける
        break;
      }
      page++;
    }

    return allCommits;
  }

  // GitHub API(List pull requests)を呼び出して、指定されたリポジトリのプルリクエスト情報を取得する
  async fetchPullRequests(
    owner: string,
    repo: string,
    since: Date | null,
    mode: string,
  ): Promise<GithubPullRequest[]> {
    let page = 1;
    const perPage = 100;
    const allPullRequests: GithubPullRequest[] = [];

    while (true) {
      const params = new URLSearchParams({
        state: 'all', // allは、 openとclosedの両方を取得するためのパラメータ
        sort: 'updated', // PRはsinceパラメータがないため更新日の降順で取得し、同期していないデータまでを同期する
        direction: 'desc',
        per_page: perPage.toString(),
        page: page.toString(),
      });
      const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/pulls?${params}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch pull requests: ${response.statusText}`,
        );
      }
      const pullRequests: GithubPullRequest[] = await response.json();

      for (const pr of pullRequests) {
        // sinceが指定されていて、sinceより更新日が古いPRについてはすでに同期済みのためこの時点で返す
        if (since && mode === 'diff' && new Date(pr.updated_at) < since) {
          return allPullRequests;
        }
        allPullRequests.push(pr);
      }

      if (pullRequests.length < perPage) {
        break;
      }
      page++;
    }

    return allPullRequests;
  }
}
