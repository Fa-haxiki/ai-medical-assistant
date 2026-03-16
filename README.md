# AI医疗助手

基于 React + NestJS + LangChain JS + 通义千问的智能医疗问答系统，支持基于检索增强生成（RAG）的医疗知识问答。


正常提问

![AI医疗助手](/frontend/public/nomal.png)

经过RAG处理提问

![AI医疗助手](/frontend/public/ragResult.png)


## 项目简介

AI医疗助手是一个结合了最新人工智能技术的医疗问答系统，旨在为用户提供准确、专业的医疗咨询服务。系统采用前后端分离架构，前端使用 React 构建友好的用户界面，后端使用 NestJS 提供 API 服务，并结合 LangChain JS 框架和通义千问大语言模型提供智能问答能力。本项目是本人用于学习 LangChain 的练手项目，后续会继续完善。

### 核心功能

- 🩺 **医疗问答**：针对用户的医疗问题提供专业解答
- 💬 **实时对话**：流式响应，打字机效果，提升用户体验
- 🧠 **上下文记忆**：支持多轮对话，理解上下文信息
- 📚 **知识检索**：基于RAG技术，从医疗知识库中检索相关信息
- 🎨 **美观界面**：现代化的聊天UI，支持Markdown渲染
- 🔄 **对话记忆**：自动保存对话历史，支持会话恢复

## 技术栈

### 前端
- **框架**：React 19 + TypeScript
- **状态管理**：React Hooks
- **样式**：CSS Modules
- **网络请求**：Fetch API（支持流式响应）
- **组件**：
  - 自定义聊天界面
  - Markdown渲染 (react-markdown)
  - 弹窗组件
  - 消息提示 (react-hot-toast)

### 后端
- **框架**：NestJS（见 `backend-nest/`）
- **AI框架**：LangChain JS
- **大语言模型**：通义千问 (qwen-turbo/qwen-plus/qwen-max)
- **向量数据库**：Chroma
- **文本嵌入**：DashScope Embeddings
- **流式响应**：SSE (Server-Sent Events)
- **文档处理**：LangChain Text Splitters

## 系统架构

```
┌─────────────┐    HTTP/SSE    ┌──────────────┐     API     ┌─────────────┐
│   Frontend  │◄──────────────►│    Backend   │◄───────────►│ Tongyi API  │
│  (React.js) │                │  (NestJS)    │             │ (qwen-turbo) │
└─────────────┘                └──────────────┘             └─────────────┘
                                      │
                                      │ Query
                                      ▼
                              ┌──────────────┐
                              │Vector Database│
                              │   (Chroma)   │
                              └──────────────┘
                                      │
                                      │ 上传 / 检索
                                      ▼
                              ┌──────────────┐
                              │ Knowledge Base│
                              │ (上传文档入库) │
                              └──────────────┘
```

## 安装指南

### 环境要求

- Node.js 24+（后端）、16+（前端）
- 通义千问 API 密钥（可在 [阿里云 DashScope](https://dashscope.console.aliyun.com/) 申请）

### 后端设置

1. 进入后端目录并安装依赖：

```bash
cd backend-nest
npm install
```

2. 配置环境变量：复制示例并填写 API Key 等（若无示例可从项目根或 `backend-nest` 下新建 `.env`）：

```bash
cp .env.example .env   # 若无 .env.example，可手动创建 .env，配置 PORT、HOST、DASHSCOPE_API_KEY、CHROMA_URL、CORS_ALLOW_ORIGINS 等
```

3. （可选）启用 RAG：需先启动 Chroma，例如：

```bash
docker run -p 8010:8000 chromadb/chroma
// 或者
cd backend-nest
chroma run --host 0.0.0.0 --port 8010 --path ./chroma_data
```

在 `.env` 中设置 `CHROMA_URL=http://localhost:8010`。

4. （可选）启用对话历史持久化：若已安装 MySQL 9.x，在 `.env` 中配置：

```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=medical_assistant
```

首次启动时会自动建表（`conversations`、`messages`）。如自动建表失败，可手动初始化：

```bash
# 先确保数据库存在（只需一次）
mysql -h localhost -P 3306 -u root -p -e "CREATE DATABASE IF NOT EXISTS medical_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 再导入 schema.sql（在 backend-nest 目录下）
mysql -h localhost -P 3306 -u root -p medical_assistant < src/database/schema.sql
```

可选：`CONVERSATION_INACTIVE_DAYS=30`（多少天未活跃则清理）、`MAX_MESSAGES_PER_CONVERSATION=200`（单会话最多保留消息数）。不配置 MySQL 时仍使用内存存储。

5. （可选）参数与限流：可配置 `MAX_MESSAGE_LENGTH`（单条消息最大字符，默认 10000）、`MAX_CHAT_HISTORY_LENGTH`（请求体历史条数上限，默认 50）、`MAX_IMAGE_SIZE_MB`（多模态图片 base64 最大 MB，默认 5）、`MAX_UPLOAD_FILE_SIZE_MB`（知识库上传最大 MB，默认 10）、`THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT`（限流时间窗与每 IP 请求数，默认 60 秒 / 120 次）、`MAX_CONCURRENT_CHAT_PER_IP`（同 IP 并发对话/流式数，默认 3）。

6. 启动开发服务：

```bash
npm run start:dev
```

服务默认监听 `HOST`/`PORT`（如 `localhost:8000`），访问根路径 `/` 可查看健康检查与 RAG 状态。若已配置 MySQL，启动日志会提示「会话持久化已启用（MySQL）」。

### 前端设置

1. 进入前端目录
```bash
cd ../frontend
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm start
```

4. 浏览器访问 http://localhost:3000 开始使用

## 使用指南

1. **开始对话**：在输入框中输入医疗相关问题，如"高血压应该注意什么？"
2. **查看回复**：系统会从医疗知识库中检索相关信息，结合大语言模型生成回答
3. **多轮对话**：系统支持基于上下文的多轮对话，可以追问或者深入讨论某个问题
4. **更新API密钥**：如果需要更新API密钥，点击右上角"设置API密钥"按钮

## API 文档

启动后端服务器后，可用以下主要接口：

- `/api/chat` - 非流式聊天接口
- `/api/chat/stream` - 流式聊天接口（SSE）
- `/api/history/:conversationId` - 获取会话历史（当前存储在内存中）
- `/api/chat/multimodal-json` - 图片+文本多模态（Base64）
- `/api/text2image` - 文生图
- `/api/knowledge/upload` - 上传知识文件写入向量库（支持 `.md/.txt/.pdf/.docx`）

## 项目扩展

- **支持更多模型**：可以扩展支持更多的大语言模型
- **自定义知识库**：通过 `/api/knowledge/upload` 上传文档（.md/.txt/.pdf/.docx）写入向量库
- **用户认证**：添加用户登录和权限管理
- **日志分析**：添加详细的用户对话日志分析功能

## 贡献指南

欢迎为项目做出贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [LangChain](https://github.com/langchain-ai/langchain) - LLM应用框架
- [React](https://reactjs.org/) - 用户界面库
- [通义千问](https://dashscope.aliyun.com/) - 大语言模型服务