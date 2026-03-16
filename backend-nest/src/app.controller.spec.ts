import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RagService } from './rag/rag.service';

describe('AppController', () => {
  let appController: AppController;
  let ragService: { isRagEnabled: jest.Mock<boolean, []> };

  beforeEach(async () => {
    ragService = {
      isRagEnabled: jest.fn().mockReturnValue(true),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: RagService, useValue: ragService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return status payload with rag enabled', () => {
      const res = appController.getRoot();
      expect(res).toHaveProperty('status', 'ok');
      expect(res).toHaveProperty('rag_status', 'enabled');
    });
  });
});
