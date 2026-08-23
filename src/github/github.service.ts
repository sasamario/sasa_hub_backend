import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../prisma/prisma.service';
import {
  CommitsTimeseriesQuery,
  CommitsTimeseriesResult,
} from './github.types';

@Injectable()
export class GithubService {
  constructor(private prismaService: PrismaService) {}

  async getSummary(
    from?: Date,
    to?: Date,
  ): Promise<{ commitCount: number; prCount: number }> {
    const activityDateFilter = {
      not: null,
      ...(from && { gte: from }),
      ...(to && { lt: to }),
    };

    const [commitCount, prCount] = await Promise.all([
      this.prismaService.githubActivity.count({
        where: {
          type: 'commit',
          activityDate: activityDateFilter,
        },
      }),
      this.prismaService.githubActivity.count({
        where: {
          type: 'pull_request',
          activityDate: activityDateFilter,
        },
      }),
    ]);

    return { commitCount, prCount };
  }

  async getCommitsTimeseries(
    query: CommitsTimeseriesQuery,
  ): Promise<CommitsTimeseriesResult> {
    const conditions: Prisma.Sql[] = [Prisma.sql`type = 'commit'`];

    if (query.from) {
      conditions.push(Prisma.sql`activity_date >= ${query.from}`);
    }

    if (query.to) {
      // toは事前に比較用に1日進めているため、toを含まないという条件にする
      conditions.push(Prisma.sql`activity_date < ${query.to}`);
    }

    if (query.repository) {
      conditions.push(Prisma.sql`repository = ${query.repository}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prismaService.$queryRaw<
      { period: Date; count: bigint }[]
    >`
      SELECT
        -- activity_date(タイムゾーンなし)をUTCと明示し、その後JST表記に変換
        date_trunc(${query.unit}, activity_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo') AS period
        , count(*) AS count
      FROM
        github_activities
      WHERE
        ${where}
      GROUP BY
        period
      ORDER BY
        period ASC
    `;

    return {
      data: rows.map((row) => ({
        period: row.period.toISOString().slice(0, 10), // YYYY-MM-DD切り出し
        count: Number(row.count),
      })),
    };
  }
}
