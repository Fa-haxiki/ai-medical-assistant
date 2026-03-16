import { Test, TestingModule } from '@nestjs/testing';
import { MultimodalService } from './multimodal.service';
import { AppConfigService } from '../config/config.service';

// 使用全局 fetch mock
const fetchMock = jest.fn();
// @ts-expect-error override global for test
global.fetch = fetchMock;

describe('MultimodalService', () => {
  let service: MultimodalService;
  let config: jest.Mocked<AppConfigService>;

  beforeEach(async () => {
    fetchMock.mockReset();

    config = {
      dashscopeApiKey: 'test-key',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultimodalService,
        { provide: AppConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<MultimodalService>(MultimodalService);
  });

  it('multimodalChat should return text when provider succeeds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: {
          choices: [
            {
              message: {
                content: [{ text: 'hello' }, { text: ' world' }],
              },
            },
          ],
        },
      }),
    });

    const result = await service.multimodalChat('问题', 'data:image/png;base64,xxx', []);
    expect(result).toBe('hello world');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('textToImage should throw friendly error on quota exceed (429)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          code: 'QuotaExceed',
          message: 'quota exceeded',
        }),
    });

    await expect(
      service.textToImage('生成图片', { n: 1, size: '1024*1024' }),
    ).rejects.toMatchObject({
      message: '当前调用过于频繁或额度已用完，请稍后再试',
    });
  });

  it('textToImage should throw friendly error on auth failure (401)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          code: 'InvalidApiKey',
          message: 'invalid key',
        }),
    });

    await expect(
      service.textToImage('生成图片', { n: 1, size: '1024*1024' }),
    ).rejects.toMatchObject({
      message: '多模态服务认证失败，请检查 DashScope API Key 配置',
    });
  });
});

