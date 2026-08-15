import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('sync-all-repositories')
  syncAllRepositories(@Query('mode') mode: string = 'diff'): Promise<string> {
    return this.appService.syncAllRepositories(mode);
  }

  @Get('sync-articles')
  syncArticles(): Promise<string> {
    return this.appService.syncArticles();
  }
}
