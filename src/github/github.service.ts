import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
