import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
// 先加载 .env，若不存在则回退到 .env.example（便于直接使用 example 作为配置）
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");
if (fs.existsSync(envPath)) {
  loadEnv({ path: envPath });
} else if (fs.existsSync(envExamplePath)) {
  loadEnv({ path: envExamplePath });
}

export const config = {
  port: parseInt(process.env.PORT ?? "8000", 10),
  host: process.env.HOST ?? "localhost",
  corsOrigin: process.env.CORS_ALLOW_ORIGINS ?? "http://localhost:3000",

  /** 阿里云百炼 API Key，支持 DASHSCOPE_API_KEY 或 ALIBABA_API_KEY */
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_API_KEY ?? "",

  /** Chroma 服务地址，例如 http://localhost:8010 或仅 host；不设置则禁用 RAG */
  chromaUrl: process.env.CHROMA_URL ?? process.env.CHROMA_HOST ?? "",
  /** 解析后的 Chroma host（从 CHROMA_URL 或 CHROMA_HOST） */
  get chromaHost(): string {
    const u = this.chromaUrl;
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) {
      try {
        return new URL(u).hostname;
      } catch {
        return "localhost";
      }
    }
    return u.split(":")[0] || "localhost";
  },
  /** 解析后的 Chroma port */
  get chromaPort(): number {
    const u = this.chromaUrl;
    if (!u) return 8010;
    if (u.startsWith("http://") || u.startsWith("https://")) {
      try {
        const p = new URL(u).port;
        return p ? parseInt(p, 10) : 8010;
      } catch {
        return 8010;
      }
    }
    const parts = u.split(":");
    return parts[1] ? parseInt(parts[1], 10) : 8010;
  },
  chromaCollectionName: process.env.CHROMA_COLLECTION ?? "medical-knowledge",

  /** 知识库 Markdown 路径，优先 backend-node/knowledge，其次 ../backend */
  knowledgePath: process.env.KNOWLEDGE_PATH ?? "",
};

export function getKnowledgePath(): string | null {
  if (config.knowledgePath) {
    return config.knowledgePath;
  }
  const candidates = [
    path.join(__dirname, "..", "knowledge", "full1.md"),
    path.join(__dirname, "..", "..", "backend", "full1.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}
