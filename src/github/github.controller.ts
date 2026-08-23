import { Controller, Get, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import {
  parseJstDateStart,
  parseJstDateExclusiveEnd,
} from '../common/date.util';
import { GetCommitsTimeseriesQueryDto } from './dto/get-commits-timeseries.dto';
import { CommitsTimeseriesResult } from './github.types';

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

  // Githubコミット推移（期間、コミット数）取得
  @Get('commits/timeseries')
  getTimeSeries(
    @Query() query: GetCommitsTimeseriesQueryDto,
  ): Promise<CommitsTimeseriesResult> {
    const fromDate = query.from ? parseJstDateStart(query.from) : undefined;
    const toDate = query.to ? parseJstDateExclusiveEnd(query.to) : undefined;

    return this.githubService.getCommitsTimeseries({
      unit: query.unit,
      from: fromDate,
      to: toDate,
      repository: query.repository,
    });
  }
}
