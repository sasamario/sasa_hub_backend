import { Injectable } from '@nestjs/common';
import { GithubCommit, GithubPullRequest } from './github-api.types';

const GITHUB_API_BASE_URL = 'https://api.github.com';

@Injectable()
export class GithubApiService {
  // GitHub API(List commits)を呼び出して、指定されたリポジトリのコミット情報を取得する
  async fetchCommits(owner: string, repo: string): Promise<GithubCommit[]> {
    const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch commits: ${response.statusText}`);
    }
    const commits: GithubCommit[] = await response.json();

    return commits;
  }

  // GitHub API(List pull requests)を呼び出して、指定されたリポジトリのプルリクエスト情報を取得する
  async fetchPullRequests(
    owner: string,
    repo: string,
  ): Promise<GithubPullRequest[]> {
    const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/pulls`;
    const params = new URLSearchParams({
      state: 'all', // allは、 openとclosedの両方を取得するためのパラメータ
    });
    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pull requests: ${response.statusText}`);
    }
    const pullRequests: GithubPullRequest[] = await response.json();

    return pullRequests;
  }
}
