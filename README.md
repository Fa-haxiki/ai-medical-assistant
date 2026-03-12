# AI医疗助手

基于 React + Node.js/Express + LangChain JS + 通义千问的智能医疗问答系统，支持基于检索增强生成（RAG）的医疗知识问答。


正常提问

![AI医疗助手](/frontend/public/nomal.png)

经过RAG处理提问

![AI医疗助手](/frontend/public/ragResult.png)


## 项目简介

AI医疗助手是一个结合了最新人工智能技术的医疗问答系统，旨在为用户提供准确、专业的医疗咨询服务。系统采用前后端分离架构，前端使用 React 构建友好的用户界面，后端使用 Node.js/Express 提供 API 服务，并结合 LangChain JS 框架和通义千问大语言模型提供智能问答能力。本项目是本人用于学习 LangChain 的练手项目，后续会继续完善。

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
- **框架**：Node.js/Express（见 `backend-node/`）
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
│  (React.js) │                │ (Express.js) │             │ (qwen-turbo) │
└─────────────┘                └──────────────┘             └─────────────┘
                                      │
                                      │ Query
                                      ▼
                              ┌──────────────┐
                              │Vector Database│
                              │   (Chroma)   │
                              └──────────────┘
                                      │
                                      │ Index
                                      ▼
                              ┌──────────────┐
                              │ Knowledge Base│
                              │  (Markdown)  │
                              └──────────────┘
```

## 安装指南

### 环境要求

- Node.js 24+（后端见 `backend-node/`），16+（前端）
- 通义千问API密钥 (可在[阿里云DashScope](https://dashscope.console.aliyun.com/)申请)

### 后端设置

详见 `backend-node/README.md`。简要步骤：

```bash
cd backend-node
cp .env.example .env   # 填写 DASHSCOPE_API_KEY 等
npm install
# 可选：启动 Chroma 以启用 RAG — docker run -p 8010:8000 chromadb/chroma，并设置 CHROMA_URL=http://localhost:8010
npm run dev
```

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

## API文档

启动后端服务器后，可用以下接口：

- `/api/chat` - 非流式聊天接口
- `/api/chat/stream` - 流式聊天接口（SSE）
- `/api/history/:conversationId` - 获取会话历史
- `/api/chat/multimodal` - 图片+文本多模态（表单上传）
- `/api/chat/multimodal-json` - 图片+文本多模态（Base64）
- `/api/text2image` - 文生图
- `/api/knowledge/upload` - 上传知识文件写入向量库（支持 `.md/.txt/.pdf/.docx`）

## 项目扩展

- **支持更多模型**：可以扩展支持更多的大语言模型
- **自定义知识库**：更新`full1.md`文件或添加更多知识文档
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