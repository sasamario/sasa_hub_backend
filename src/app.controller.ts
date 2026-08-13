import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Get('sync-repository')
  syncRepository(): Promise<string> {
    return this.appService.syncRepository();
  }

  @Get('sync-all-repositories')
  syncAllRepositories(): Promise<string> {
    return this.appService.syncAllRepositories();
  }

  @Get('sync-articles')
  syncArticles(): Promise<string> {
    return this.appService.syncArticles();
  }
}
