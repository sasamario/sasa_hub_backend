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
  }
}