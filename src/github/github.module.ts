import { Module } from '@nestjs/common';
import { GithubApiService } from './github-api.service';
import { GithubSyncService } from './github-sync.service';

@Module({
  providers: [GithubApiService, GithubSyncService],
  exports: [GithubApiService, GithubSyncService]
})
export class GithubModule {}
