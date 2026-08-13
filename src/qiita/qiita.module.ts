import { Module } from '@nestjs/common';
import { QiitaApiService } from './qiita-api.service';
import { QiitaSyncService } from './qiita-sync.service';

@Module({
  providers: [QiitaApiService, QiitaSyncService],
  exports: [QiitaApiService, QiitaSyncService],
})
export class QiitaModule {}
