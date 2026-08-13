import { Test, TestingModule } from '@nestjs/testing';
import { QiitaApiService } from './qiita-api.service';

describe('QiitaApiService', () => {
  let service: QiitaApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QiitaApiService],
    }).compile();

    service = module.get<QiitaApiService>(QiitaApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
