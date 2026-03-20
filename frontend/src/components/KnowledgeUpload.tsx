import React, { useEffect, useRef, useState } from 'react';
import {
  getKnowledgeStats,
  listKnowledgeFiles,
  getKnowledgeUploadJob,
  uploadKnowledgeFile,
  uploadKnowledgeZip,
  type ZipUploadJob,
  type KnowledgeStats,
  type KnowledgeFileItem,
} from '../services/chatService';
import './KnowledgeUpload.css';

const KnowledgeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipSubmitLoading, setZipSubmitLoading] = useState(false);
  const [zipJob, setZipJob] = useState<ZipUploadJob | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const pollFailCountRef = useRef(0);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [files, setFiles] = useState<KnowledgeFileItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [statsRes, filesRes] = await Promise.all([
        getKnowledgeStats(),
        listKnowledgeFiles(20),
      ]);
      setStats(statsRes);
      setFiles(filesRes);
    } catch (e) {
      console.error(e);
      setSummaryError('加载知识库汇总信息失败，请稍后重试。');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const handleZipFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setZipFile(selected);
    setZipError(null);
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const res = await uploadKnowledgeFile(file);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        const msg =
          res.message ??
          `文件 ${res.filename ?? file.name} 已上传，新增片段数：${res.chunks ?? 0}`;
        setResultMessage(msg);
        await loadSummary();
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('上传过程中出现错误，请稍后重试。');
    } finally {
      setIsUploading(false);
    }
  };

  const handleZipUpload = async () => {
    if (!zipFile || zipSubmitLoading) return;
    setZipSubmitLoading(true);
    setZipError(null);
    setZipJob(null);
    pollFailCountRef.current = 0;

    try {
      const res = await uploadKnowledgeZip(zipFile);
      if (res.error) {
        setZipError(res.error);
        return;
      }
      if (res.jobId) {
        setZipJob({
          jobId: res.jobId,
          status: (res.status as ZipUploadJob['status']) || 'queued',
        });
      } else {
        setZipError('未收到任务 ID，请稍后重试。');
      }
    } catch (e) {
      console.error(e);
      setZipError('提交 ZIP 任务失败，请稍后重试。');
    } finally {
      setZipSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (!zipJob?.jobId) return;
    if (zipJob.status === 'done' || zipJob.status === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const next = await getKnowledgeUploadJob(zipJob.jobId);
        setZipJob(next);
        setZipError(null);
        pollFailCountRef.current = 0;
      } catch (e) {
        console.error(e);
        pollFailCountRef.current += 1;
        if (pollFailCountRef.current >= 3) {
          setZipError('任务状态轮询失败，请稍后手动刷新或重试。');
          clearInterval(timer);
        }
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [zipJob?.jobId, zipJob?.status]);

  useEffect(() => {
    void loadSummary();
  }, []);

  useEffect(() => {
    if (zipJob?.status === 'done') {
      void loadSummary();
    }
  }, [zipJob?.status]);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  };

  return (
    <div className="knowledge-upload-container">
      <div className="knowledge-upload-header">
        <h2>知识库管理</h2>
        <p>上传新的 Markdown / 文本文件，系统会自动切分并写入现有 Chroma 向量库，用于后续问答检索。</p>
      </div>

      <div className="knowledge-upload-card">
        <div className="summary-header-row">
          <h3>文档库汇总信息</h3>
          <button
            className="summary-refresh-button"
            onClick={() => void loadSummary()}
            disabled={summaryLoading}
          >
            {summaryLoading ? '刷新中…' : '刷新'}
          </button>
        </div>

        {summaryError && <div className="result-message error">{summaryError}</div>}

        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">文档总数</span>
            <strong>{stats?.total_files ?? 0}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">片段总数</span>
            <strong>{stats?.total_chunks ?? 0}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">最近上传时间</span>
            <strong>{formatDate(stats?.last_uploaded_at)}</strong>
          </div>
        </div>

        <div className="summary-files">
          <p>最近文档（最多 20 条）</p>
          {!files.length ? (
            <div className="empty-files">暂无文档记录</div>
          ) : (
            <ul>
              {files.map((item) => (
                <li key={`${item.id}-${item.filename}`}>
                  <span>{item.filename}</span>
                  <span>{item.chunk_count} 片段</span>
                  <span>{formatDate(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="knowledge-upload-card">
        <h3>单文件上传</h3>
        <div className="file-input-row">
          <input
            type="file"
            accept=".md,.txt,.pdf,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {file && (
          <div className="file-info">
            <span>已选择文件：</span>
            <strong>{file.name}</strong>
          </div>
        )}

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? '正在上传并向量化…' : '上传并写入向量库'}
        </button>

        <div className="tips">
          <p>提示：</p>
          <ul>
            <li>目前支持 <code>.md</code>、<code>.txt</code>、<code>.pdf</code> 和 <code>.docx</code> 文件。</li>
            <li>会按照当前系统的切分规则（2000 字符、200 重叠）进行分片。</li>
            <li>确保后端已正确配置百炼 API Key 和 Chroma 服务地址。</li>
          </ul>
        </div>

        {resultMessage && (
          <div className="result-message success">
            {resultMessage}
          </div>
        )}
        {errorMessage && (
          <div className="result-message error">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="knowledge-upload-card">
        <h3>ZIP 批量上传（仅 PDF）</h3>
        <div className="file-input-row">
          <input
            type="file"
            accept=".zip"
            onChange={handleZipFileChange}
            disabled={zipSubmitLoading}
          />
        </div>
        {zipFile && (
          <div className="file-info">
            <span>已选择压缩包：</span>
            <strong>{zipFile.name}</strong>
          </div>
        )}
        <button
          className="upload-button"
          onClick={handleZipUpload}
          disabled={!zipFile || zipSubmitLoading}
        >
          {zipSubmitLoading ? '正在创建任务…' : '上传 ZIP 并后台入库'}
        </button>

        {zipJob && (
          <div className="zip-job-panel">
            <div><strong>任务ID：</strong>{zipJob.jobId}</div>
            <div><strong>状态：</strong>{zipJob.status}</div>
            <div><strong>文件数：</strong>{zipJob.totalFiles ?? 0}</div>
            <div><strong>成功：</strong>{zipJob.successCount ?? 0}</div>
            <div><strong>失败：</strong>{zipJob.failedCount ?? 0}</div>
            <div><strong>总片段：</strong>{zipJob.totalChunks ?? 0}</div>
            {zipJob.error && (
              <div className="result-message error">{zipJob.error}</div>
            )}
            {zipJob.results?.some((r) => r.status === 'failed') && (
              <div className="zip-failed-list">
                <p>失败明细：</p>
                <ul>
                  {zipJob.results
                    .filter((r) => r.status === 'failed')
                    .map((r) => (
                      <li key={`${r.filename}-${r.error ?? ''}`}>
                        {r.filename}: {r.error ?? '未知错误'}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {zipError && (
          <div className="result-message error">
            {zipError}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeUpload;

