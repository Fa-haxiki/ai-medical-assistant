import { Router, Request, Response } from "express";
import { smartAnswer, getFallbackResponse } from "../chat.js";
import { getOrCreateConversation, appendMessage, getHistory } from "../store.js";
import { multimodalChat, textToImage } from "../dashscope.js";
import { config } from "../config.js";
import { addKnowledgeFromText } from "../rag.js";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// mammoth 为 CommonJS，用 require 加载
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const mammoth: any = require("mammoth");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

export const chatRouter = Router();

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length && typeof v[0] === "string") return v[0];
  return undefined;
}

function getConversationId(req: Request): string {
  const id =
    asString(req.query.conversation_id) ||
    asString(req.headers["x-conversation-id"]) ||
    String(Date.now());
  getOrCreateConversation(id);
  return id;
}

chatRouter.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const conversationId = getConversationId(req);
    const { message, chat_history = [] } = req.body as {
      message?: string;
      chat_history?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "缺少 message" });
      return;
    }

    let history = chat_history;
    if (!history?.length) {
      history = getHistory(conversationId).map((m) => ({ role: m.role, content: m.content }));
    }

    const responseContent = await smartAnswer(message, history);
    appendMessage(conversationId, "user", message);
    appendMessage(conversationId, "assistant", responseContent);

    res.json({ response: responseContent, conversation_id: conversationId });
  } catch (e) {
    console.error("POST /api/chat error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// POST：单请求流式聊天。请求体带 message + chat_history，响应为 SSE 流，直接走 RAG
chatRouter.post("/api/chat/stream", async (req: Request, res: Response) => {
  process.stderr.write(`[chat/stream] 请求体: ${JSON.stringify(req.body ?? {})}\n`);

  const conversationId = getConversationId(req);
  const { message, chat_history = [] } = req.body as {
    message?: string;
    chat_history?: Array<{ role: string; content: string }>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: string) => {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  };

  if (!message || typeof message !== "string") {
    send("message", "请输入您的问题");
    send("done", JSON.stringify({ message: "Stream completed", conversation_id: conversationId }));
    res.end();
    return;
  }

  let history: Array<{ role: string; content: string }> = chat_history;
  if (!history.length) {
    history = getHistory(conversationId).map((m) => ({ role: m.role, content: m.content }));
  }

  console.error("[chat/stream] 历史记录条数:", history.length);

  try {
    appendMessage(conversationId, "user", message);
    const fullResponse = await smartAnswer(message, history);
    appendMessage(conversationId, "assistant", fullResponse);
    for (const char of fullResponse) send("message", char);
    send("done", JSON.stringify({ message: "Stream completed", conversation_id: conversationId }));
  } catch (e) {
    const err = e as Error;
    console.error("[chat/stream] 错误:", err?.message ?? String(e));
    if (err?.stack) console.error(err.stack);
    const fallback = getFallbackResponse(message, history);
    for (const char of fallback) send("message", char);
    send("done", JSON.stringify({ message: "Stream completed with fallback", conversation_id: conversationId }));
  }
  res.end();
});

chatRouter.get("/api/history/:conversationId", (req: Request, res: Response) => {
  const conversationId = asString(req.params.conversationId) ?? "";
  getOrCreateConversation(conversationId);
  const messages = getHistory(conversationId);
  res.json({ history: messages, conversation_id: conversationId });
});

chatRouter.post("/api/chat/multimodal", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const conversationId = getConversationId(req);
    const message = (req.body?.message as string) ?? "";
    const file = req.file;
    if (!file || !message) {
      res.status(400).json({ error: "需要 message 和 file" });
      return;
    }
    const imageBuffer = fs.readFileSync(file.path);
    const imageBase64 = imageBuffer.toString("base64");
    fs.unlinkSync(file.path);

    const history = getHistory(conversationId)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
    const responseText = await multimodalChat(message, imageBase64, history);
    appendMessage(conversationId, "user", message);
    appendMessage(conversationId, "assistant", responseText);

    res.json({ response: responseText, conversation_id: conversationId });
  } catch (e) {
    console.error("multimodal error:", e);
    res.status(500).json({ error: String(e) });
  }
});

chatRouter.post("/api/chat/multimodal-json", async (req: Request, res: Response) => {
  try {
    const conversationId = getConversationId(req);
    const { message, chat_history = [], image_data } = req.body as {
      message?: string;
      chat_history?: Array<{ role: string; content: string }>;
      image_data?: string;
    };
    if (!message || !image_data) {
      res.status(400).json({ error: "需要 message 和 image_data (base64)" });
      return;
    }
    let base64 = image_data;
    if (base64.includes(";base64,")) base64 = base64.split(";base64,")[1];
    else if (base64.includes(",")) base64 = base64.split(",")[1];

    const history = chat_history.length
      ? chat_history
      : getHistory(conversationId)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));
    const responseText = await multimodalChat(message, base64, history);
    appendMessage(conversationId, "user", message);
    appendMessage(conversationId, "assistant", responseText);

    res.json({ response: responseText, conversation_id: conversationId });
  } catch (e) {
    console.error("multimodal-json error:", e);
    res.status(500).json({ error: String(e) });
  }
});

chatRouter.post("/api/text2image", async (req: Request, res: Response) => {
  try {
    const conversationId = getConversationId(req);
    const { prompt, negative_prompt, n = 1, size = "1024*1024" } = req.body ?? {};
    if (!prompt) {
      res.status(400).json({ error: "需要 prompt" });
      return;
    }
    const urls = await textToImage(prompt, { negative_prompt, n, size });
    appendMessage(conversationId, "user", `请根据以下描述生成图片: ${prompt}`);
    if (urls[0]) {
      appendMessage(conversationId, "assistant", `已根据您的描述生成图片: ${prompt}`, urls[0]);
    }
    res.json({ image_urls: urls, conversation_id: conversationId });
  } catch (e) {
    console.error("text2image error:", e);
    res.status(500).json({ error: String(e) });
  }
});

/**
 * 上传新的知识文件，并写入现有 Chroma 向量库
 * 使用 multipart/form-data，字段名为 file
 */
chatRouter.post("/api/knowledge/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "请通过字段 file 上传文件" });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let raw = "";

    if ([".md", ".txt"].includes(ext)) {
      raw = fs.readFileSync(file.path, "utf-8");
    } else if (ext === ".pdf") {
      const buffer = fs.readFileSync(file.path);
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      raw = result?.text ?? "";
      await parser.destroy();
    } else if (ext === ".docx") {
      const buffer = fs.readFileSync(file.path);
      const result = await mammoth.extractRawText({ buffer });
      raw = result.value ?? "";
    } else {
      fs.unlinkSync(file.path);
      res.status(400).json({ error: "目前仅支持 .md、.txt、.pdf 和 .docx 文件" });
      return;
    }

    fs.unlinkSync(file.path);

    if (!raw.trim()) {
      res.status(400).json({ error: "文件内容为空或无法解析为文本" });
      return;
    }

    const chunks = await addKnowledgeFromText(raw, file.originalname);
    res.json({
      success: true,
      filename: file.originalname,
      chunks,
      message: `文件已成功写入向量库，共 ${chunks} 个片段`,
    });
  } catch (e) {
    const err = e as Error;
    console.error("knowledge upload error:", err?.message ?? String(e));
    res.status(500).json({
      error: err?.message ?? String(e),
    });
  }
});
