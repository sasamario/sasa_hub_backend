export interface RepositoryInfo {
  owner: string;
  repo: string;
}

// List Commits APIのレスポンスの型定義
export interface GithubCommit {
  sha: string;
  html_url: string;
  commit: {
    author: {
      date: string;
    };
    message: string;
  };
}

// List Pull Requests APIのレスポンスの型定義
export interface GithubPullRequest {
  number: number;
  html_url: string;
  title: string;
  merged_at: string | null;
  updated_at: string;
}
