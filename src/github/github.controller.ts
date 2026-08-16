import { Controller, Get, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import {
  parseJstDateStart,
  parseJstDateExclusiveEnd,
} from '../common/date.util';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  // Githubサマリー（コミット総数、PR総数）取得
  @Get('summary')
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{ commitCount: number; prCount: number }> {
    const fromDate = from ? parseJstDateStart(from) : undefined;
    const toDate = to ? parseJstDateExclusiveEnd(to) : undefined;

    return this.githubService.getSummary(fromDate, toDate);
  }
}
