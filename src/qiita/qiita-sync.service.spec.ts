import { Test, TestingModule } from '@nestjs/testing';
import { QiitaSyncService } from './qiita-sync.service';

describe('QiitaSyncService', () => {
  let service: QiitaSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QiitaSyncService],
    }).compile();

    service = module.get<QiitaSyncService>(QiitaSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
