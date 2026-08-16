import { Module } from '@nestjs/common';
import { GithubApiService } from './github-api.service';
import { GithubSyncService } from './github-sync.service';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';

@Module({
  providers: [GithubApiService, GithubSyncService, GithubService],
  exports: [GithubApiService, GithubSyncService],
  controllers: [GithubController],
})
export class GithubModule {}
