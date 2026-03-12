import React, { useState } from 'react';
import { uploadKnowledgeFile } from '../services/chatService';
import './KnowledgeUpload.css';

const KnowledgeUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResultMessage(null);
    setErrorMessage(null);
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
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('上传过程中出现错误，请稍后重试。');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="knowledge-upload-container">
      <div className="knowledge-upload-header">
        <h2>知识库管理</h2>
        <p>上传新的 Markdown / 文本文件，系统会自动切分并写入现有 Chroma 向量库，用于后续问答检索。</p>
      </div>

      <div className="knowledge-upload-card">
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
    </div>
  );
};

export default KnowledgeUpload;

