import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // グローバルプレフィックスの設定
  app.setGlobalPrefix('api');
  // パイプ（コントローラのメソッドが呼ばれる直前に割り込んで引数を変換、検証する処理）という仕組みをアプリ全体に適用するための設定
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTOに定義されていないパラメータを無視する
      transform: true, // ペイロードをDTOクラスに従って型付けされたオブジェクトに自動変換する
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
