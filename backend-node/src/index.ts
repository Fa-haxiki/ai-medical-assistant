import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initializeRag, getRetriever } from "./rag.js";
import { chatRouter } from "./routes/chat.js";

async function main() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin || "*", credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  // 请求日志：同时写 stderr 和文件，避免 concurrently 下控制台看不到
  app.use((req, _res, next) => {
    const line = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    process.stderr.write(line);
    next();
  });

  const key = config.dashscopeApiKey;
  if (key) {
    process.env.ALIBABA_API_KEY = key;
    console.log(`使用阿里云百炼 API Key: ${key.slice(0, 8)}...（已隐藏）`);
  } else {
    console.warn("未设置 DASHSCOPE_API_KEY / ALIBABA_API_KEY（阿里云百炼），聊天与 RAG 将不可用");
  }

  await initializeRag();
  const hasRag = !!getRetriever();
  console.log("RAG 状态:", hasRag ? "已启用" : "未启用");

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      message: "AI医疗助手系统正在运行",
      version: "1.0.0",
      rag_status: hasRag ? "enabled" : "disabled",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(chatRouter);

  app.listen(config.port, config.host, () => {
    console.log(`后端已启动: http://${config.host}:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
