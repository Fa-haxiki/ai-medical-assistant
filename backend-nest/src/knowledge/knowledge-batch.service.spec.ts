import AdmZip from 'adm-zip';
import { KnowledgeBatchService } from './knowledge-batch.service';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { AppConfigService } from '../config/config.service';

function buildZipBuffer(entries: Array<{ name: string; content: string }>): Buffer {
  const zip = new AdmZip();
  for (const entry of entries) {
    zip.addFile(entry.name, Buffer.from(entry.content));
  }
  return zip.toBuffer();
}

describe('KnowledgeBatchService', () => {
  let service: KnowledgeBatchService;
  let ingestService: jest.Mocked<KnowledgeIngestService>;

  beforeEach(() => {
    ingestService = {
      ingestBuffer: jest.fn(async (_buf: Buffer, originalName: string) => ({
        success: true,
        filename: originalName,
        chunks: 3,
        message: 'ok',
      })),
    } as any;

    const config = {
      maxZipFileCount: 200,
      maxZipUncompressedBytes: 200 * 1024 * 1024,
      zipJobTimeoutMs: 300000,
    } as AppConfigService;

    service = new KnowledgeBatchService(ingestService, config);
  });

  it('should process zip and aggregate success/failed results', async () => {
    ingestService.ingestBuffer.mockImplementation(async (_buf, name) => {
      if (name === 'b.pdf') throw new Error('parse failed');
      return {
        success: true,
        filename: name,
        chunks: 2,
        message: 'ok',
      };
    });
    const zipBuffer = buildZipBuffer([
      { name: 'a.pdf', content: 'a' },
      { name: 'b.pdf', content: 'b' },
      { name: 'c.txt', content: 'skip' },
    ]);

    const job = service.createZipIngestJob(zipBuffer, 'batch.zip');
    await new Promise((r) => setTimeout(r, 30));
    const done = service.getJob(job.jobId);

    expect(done?.status).toBe('done');
    expect(done?.totalFiles).toBe(2);
    expect(done?.successCount).toBe(1);
    expect(done?.failedCount).toBe(1);
    expect(done?.results).toHaveLength(2);
  });

  it('should reject non-zip file extension', () => {
    expect(() =>
      service.createZipIngestJob(Buffer.from('x'), 'batch.pdf'),
    ).toThrow('仅支持 .zip 压缩文件');
  });

  it('should skip macOS ._ and __MACOSX junk pdf entries', async () => {
    const zipBuffer = buildZipBuffer([
      { name: 'real.pdf', content: 'x' },
      { name: '._real.pdf', content: 'not-a-pdf' },
      { name: '__MACOSX/folder/._doc.pdf', content: 'junk' },
    ]);
    const job = service.createZipIngestJob(zipBuffer, 'batch.zip');
    await new Promise((r) => setTimeout(r, 30));
    const done = service.getJob(job.jobId);
    expect(done?.totalFiles).toBe(1);
    expect(done?.successCount).toBe(1);
    expect(done?.failedCount).toBe(0);
    expect(ingestService.ingestBuffer).toHaveBeenCalledTimes(1);
    expect(ingestService.ingestBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      'real.pdf',
    );
  });
});
