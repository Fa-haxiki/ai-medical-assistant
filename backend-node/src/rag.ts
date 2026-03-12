import fs from "node:fs";
import path from "node:path";
import { Document } from "@langchain/core/documents";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { config, getKnowledgePath } from "./config.js";

let retriever: VectorStoreRetriever | null = null;
let embeddings: AlibabaTongyiEmbeddings | null = null;

export function getRetriever(): VectorStoreRetriever | null {
  return retriever;
}

export function getEmbeddings(): AlibabaTongyiEmbeddings | null {
  return embeddings;
}

function formatDocs(docs: Document[]): string {
  if (!docs?.length) return "";
  return docs.map((d) => d.pageContent).join("\n\n");
}

export { formatDocs };

function buildChromaConfig() {
  return {
    collectionName: config.chromaCollectionName,
    url: config.chromaUrl.startsWith("http")
      ? config.chromaUrl
      : `http://${config.chromaHost}:${config.chromaPort}`,
  };
}

/**
 * 将新增的知识文本切分并写入现有 Chroma 向量库
 * @param raw 文本内容
 * @param source 文档来源（例如文件名）
 * @returns 实际写入的片段数量
 */
export async function addKnowledgeFromText(raw: string, source: string): Promise<number> {
  if (!embeddings) {
    throw new Error("RAG 未启用：嵌入模型未初始化或百炼 API Key 未配置");
  }
  if (!config.chromaUrl) {
    throw new Error("RAG 未启用：未配置 CHROMA_URL/CHROMA_HOST");
  }

  const docs = [
    new Document({
      pageContent: raw,
      metadata: { source },
    }),
  ];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
  });
  const splits = await splitter.splitDocuments(docs);
  if (!splits.length) {
    throw new Error("上传文件内容为空或无法切分为有效片段");
  }

  const chromaConfig = buildChromaConfig();
  const vectorStore = await Chroma.fromExistingCollection(embeddings, chromaConfig);
  await vectorStore.addDocuments(splits);
  console.log("新增知识文档已写入向量库:", source, "片段数:", splits.length);
  return splits.length;
}

/**
 * 初始化 RAG：嵌入模型 + 知识库加载 + Chroma 向量库
 * 若未配置 CHROMA_URL 或 DASHSCOPE_API_KEY，则跳过 RAG
 */
export async function initializeRag(): Promise<VectorStoreRetriever | null> {
  if (!config.dashscopeApiKey) {
    console.warn("未设置 DASHSCOPE_API_KEY/ALIBABA_API_KEY，RAG 已禁用");
    return null;
  }

  try {
    embeddings = new AlibabaTongyiEmbeddings({
      apiKey: config.dashscopeApiKey,
      modelName: "text-embedding-v2",
    });
    console.log("百炼嵌入模型初始化成功");
  } catch (e) {
    console.warn("百炼嵌入模型初始化失败:", e);
    return null;
  }

  const knowledgePath = getKnowledgePath();
  if (!knowledgePath) {
    console.warn("未找到知识库文件 (knowledge/full1.md 或 ../backend/full1.md)，RAG 已禁用");
    return null;
  }

  if (!config.chromaUrl) {
    console.warn("未设置 CHROMA_URL，RAG 已禁用");
    return null;
  }

  const chromaConfig = buildChromaConfig();

  try {
    // 先连接已有集合，避免每次重启都重新嵌入并消耗 token
    const vectorStore = await Chroma.fromExistingCollection(embeddings, chromaConfig);
    const count = await (vectorStore as { collection?: { count(): Promise<number> } }).collection?.count?.() ?? 0;

    if (count === 0) {
      console.log("Chroma 集合为空，正在从知识库构建向量索引（会消耗嵌入 token）…");
      const raw = fs.readFileSync(knowledgePath, "utf-8");
      const docs = [
        new Document({
          pageContent: raw,
          metadata: { source: path.basename(knowledgePath) },
        }),
      ];
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });
      const splits = await splitter.splitDocuments(docs);
      if (!splits.length) {
        console.warn("知识库分割后为空，RAG 已禁用");
        return null;
      }
      await vectorStore.addDocuments(splits);
      console.log("向量库构建完成，共", splits.length, "个片段");
    } else {
      console.log("复用已有 Chroma 集合，文档数:", count);
    }

    retriever = vectorStore.asRetriever({ k: 3 });
    console.log("Chroma 向量库与 RAG 检索器初始化成功");
    return retriever;
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.warn("初始化 RAG 失败:", msg);
    if (msg.includes("FreeTierOnly") || msg.includes("free tier") || msg.includes("quota") || msg.includes("额度")) {
      console.warn(
        "→ 阿里云百炼免费额度已用尽。请在百炼控制台关闭「仅用免费」或开通按量付费后重试。当前将仅使用大模型对话（无知识库检索）。"
      );
    }
    return null;
  }
}
