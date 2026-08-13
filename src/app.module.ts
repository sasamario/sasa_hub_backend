import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { QiitaModule } from './qiita/qiita.module';

@Module({
  imports: [PrismaModule, GithubModule, QiitaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
