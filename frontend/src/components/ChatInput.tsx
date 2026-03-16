import React, { useEffect, useRef } from 'react';
import './ChatInterface.css';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  selectedImage: File | null;
  previewImage: string | null;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isLoading,
  selectedImage,
  previewImage,
  onInputChange,
  onSubmit,
  onImageSelect,
  onClearImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // 当父组件清空 selectedImage 时，同步清空文件输入的值
  useEffect(() => {
    if (!selectedImage && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedImage]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      {/* 图片预览区域 */}
      {previewImage && (
        <div className="image-preview-container">
          <img src={previewImage} alt="预览" className="image-preview" />
          <button
            className="clear-image-button"
            onClick={onClearImage}
            aria-label="清除已选择的图片"
          >
            ×
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="input-container">
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          accept="image/*"
          onChange={onImageSelect}
          style={{ display: 'none' }}
          ref={fileInputRef}
          aria-hidden="true"
        />

        {/* 图片上传按钮 */}
        <button
          className="image-upload-button"
          onClick={triggerImageUpload}
          disabled={isLoading}
          type="button"
          aria-label="上传图片"
        >
          图片
        </button>

        {/* 文本输入框 */}
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入您的健康问题..."
          disabled={isLoading}
          className={selectedImage ? 'with-image' : ''}
          aria-label="聊天输入"
        />

        {/* 发送按钮 */}
        <button
          className="send-button"
          onClick={onSubmit}
          disabled={isLoading || (!input.trim() && !selectedImage)}
          type="button"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </>
  );
};
