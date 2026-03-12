# AI 医疗助手 - Node.js 后端

基于 **Node.js + Express + LangChain JS + Chroma + 阿里云百炼（通义大模型）** 的医疗问答 API，供前端直接使用。

## 技术栈

- **运行时**: Node.js 24+（推荐 24.14.0，可用 `nvm use` 配合 `.nvmrc`）
- **框架**: Express 5
- **AI**: LangChain JS（`@langchain/core`、`@langchain/community`）
- **大模型**: 通义（阿里云百炼，ChatAlibabaTongyi）
- **向量库**: Chroma（需单独启动 Chroma 服务）
- **嵌入**: 百炼 Alibaba Tongyi Embeddings（text-embedding-v1）
- **文本分割**: `@langchain/textsplitters` RecursiveCharacterTextSplitter

## 环境要求

- Node.js 24+（本地可用 `nvm use` 或 `nvm install` 后使用 24.14.0）
- 阿里云百炼 API Key（[百炼控制台](https://bailian.console.aliyun.com/) 或 [DashScope](https://dashscope.console.aliyun.com/)）
- 使用 RAG 时需先启动 Chroma 服务（见下）

## 安装与运行

### 1. 安装依赖

```bash
cd backend-node
npm install
```

### 2. 环境变量

复制示例并填写：

```bash
cp .env.example .env
# 编辑 .env，至少设置 DASHSCOPE_API_KEY
```

### 3. 知识库（可选，用于 RAG）

将医疗知识库 Markdown 放到以下任一位置即可被自动加载：

- `backend-node/knowledge/full1.md`
- 或保留在项目根目录的 `backend/full1.md`（会回退查找）

也可通过环境变量指定路径：`KNOWLEDGE_PATH=/path/to/full1.md`。

### 4. 启动 Chroma（可选，用于 RAG）

不启动 Chroma 时，接口仍可用，但不会做向量检索，仅用大模型回答。

**方式：使用 Docker 启动**

```bash
docker run -p 8010:8000 chromadb/chroma
```

同样在 `.env` 中设置 `CHROMA_URL=http://localhost:8010`。

### 5. 启动后端

```bash
# 开发（热重载）
npm run dev

# 或编译后运行
npm run build
npm start
```

默认地址：`http://0.0.0.0:8000`。

## API 说明

接口说明：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 健康检查，返回 `rag_status` 等 |
| POST | `/api/chat` | 非流式对话 |
| POST | `/api/chat/stream` | 流式对话（SSE） |
| GET | `/api/history/:conversationId` | 获取会话历史 |
| POST | `/api/chat/multimodal` | 多模态（表单：message + file） |
| POST | `/api/chat/multimodal-json` | 多模态（JSON：message + image_data base64） |
| POST | `/api/text2image` | 文生图 |
| POST | `/api/knowledge/upload` | 上传知识文件写入向量库（支持 `.md/.txt/.pdf/.docx`） |

请求体示例：

- `POST /api/chat`: `{ "message": "问题", "chat_history": [] }`
- 会话 ID 可通过查询参数 `conversation_id` 或请求头 `X-Conversation-ID` 传递。

## 项目结构

```
backend-node/
├── src/
│   ├── index.ts      # Express 入口与路由挂载
│   ├── config.ts      # 环境与路径配置
│   ├── rag.ts         # RAG 初始化（Chroma + 嵌入 + 知识库加载）
│   ├── chat.ts        # 对话逻辑（智能回答、历史、兜底）
│   ├── prompts.ts     # 系统与 RAG 提示词
│   ├── store.ts       # 会话内存存储
│   ├── dashscope.ts   # 多模态与文生图（调用百炼 API）
│   └── routes/
│       └── chat.ts    # 聊天 / 历史 / 多模态 / 文生图路由
├── knowledge/         # 可选，放置 full1.md
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 说明

- RAG 依赖 **独立 Chroma 服务**（Docker），不再内嵌 Chroma 进程。
- 多模态与文生图通过 **HTTP 调用阿里云百炼**。
- 流式输出为「先算完整回复再按字 SSE」；若需真实 token 流可后续改用 LangChain 的 `stream` 接口。

## 前端配置

前端通过 `frontend/src/services/chatService.ts` 的 `API_BASE_URL` 指向后端，例如 `http://localhost:8000/api`。

## License

与主项目一致（MIT）。
