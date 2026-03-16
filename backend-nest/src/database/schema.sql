-- MySQL: 会话与消息表（对话历史持久化）
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  image_url TEXT,
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(conversation_id, timestamp);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);

-- MySQL: 知识库文件元数据表（记录每次上传的文件及其片段数）
CREATE TABLE IF NOT EXISTS knowledge_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(512) NOT NULL,
  tag VARCHAR(255) DEFAULT NULL,
  chunk_count INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_knowledge_files_filename ON knowledge_files(filename);
CREATE INDEX idx_knowledge_files_created_at ON knowledge_files(created_at);
