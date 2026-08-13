import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// PrismaServiceをグローバルに提供するため@Global()デコレーターを使用
// これにより、他のモジュールでPrismaServiceをインポートせずに利用できるようになる
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
