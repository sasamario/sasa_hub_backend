import { Injectable } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

@Injectable()
// PrismaClientを継承して、NestJSのDIコンテナで利用できるようにするためのサービスクラス
export class PrismaService extends PrismaClient {
  constructor() {
    // as stringを使用して、環境変数がundefinedでないことを明示的に示す
    // || ""より、as stringの方がもしenvの設定が漏れていた場合、undefinedのエラーだと判断しやすいためas stringによる型アサーションを使用
    const adapter = new PrismaPg(process.env.DATABASE_URL as string);
    super({ adapter });
  }
}