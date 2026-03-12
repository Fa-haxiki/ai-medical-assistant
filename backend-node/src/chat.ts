import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getRetriever, formatDocs } from "./rag.js";
import { config } from "./config.js";
import { SYSTEM_PROMPT, DEFAULT_TEMPLATE, RAG_TEMPLATE } from "./prompts.js";

export interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
  image_url?: string;
}

function buildHistoryContext(chatHistory: ChatMessage[]): string {
  if (!chatHistory?.length) return "";
  const recent = chatHistory.slice(-5);
  let out = "\n\n聊天历史:\n";
  for (const msg of recent) {
    const roleName = msg.role === "user" ? "用户" : "AI医疗助手";
    out += `${roleName}: ${msg.content}\n`;
  }
  return out;
}

function toLangChainMessages(chatHistory: ChatMessage[]): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];
  const recent = chatHistory?.length > 10 ? chatHistory.slice(-10) : chatHistory ?? [];
  for (const msg of recent) {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  }
  return messages;
}

export function createChatModel(modelName = "qwen-turbo"): ChatAlibabaTongyi {
  return new ChatAlibabaTongyi({
    alibabaApiKey: config.dashscopeApiKey,
    model: modelName,
    modelName,
  });
}

export function getFallbackResponse(question: string, chatHistory?: ChatMessage[]): string {
  const memoryKeywords = ["之前", "刚才", "上面", "之前问", "刚问", "之前聊", "刚才说", "刚刚问"];
  const isHistoryQuestion = memoryKeywords.some((k) => question.includes(k));

  if (isHistoryQuestion && chatHistory?.length) {
    const userMsgs: string[] = [];
    for (let i = chatHistory.length - 1; i >= 0 && userMsgs.length < 2; i--) {
      const msg = chatHistory[i];
      if (msg.role === "user" && msg.content) userMsgs.push(msg.content);
    }
    if (userMsgs.length) {
      const summary = userMsgs.reverse().join("、");
      return `根据我的记忆，您之前问了关于"${summary}"的问题。\n\n很抱歉，我目前遇到了一些技术问题，无法提供完整的回答。请稍后再试，或者重新表述您的问题，我会尽力帮助您。`;
    }
  }

  return `很抱歉，我目前遇到了一些技术问题，无法处理您的请求。这可能是由于以下原因：

1. 服务器负载过高
2. API调用限制
3. 网络连接问题

请稍后再试，或者重新表述您的问题，我会尽力帮助您。如果问题持续存在，请联系技术支持。

感谢您的理解。`;
}

export async function smartAnswer(
  question: string,
  chatHistory?: ChatMessage[],
  modelName = "qwen-turbo"
): Promise<string> {
  const model = createChatModel(modelName);
  const retriever = getRetriever();

  console.log("[smartAnswer] 调用模型:", modelName);

  try {
    if (!retriever) {
      console.log("[LLM] 纯模型回答（RAG 未启用）");
      const messages = toLangChainMessages(chatHistory ?? []);
      messages.push(new HumanMessage(question));
      const res = await model.invoke(messages);
      return typeof res.content === "string" ? res.content : String(res.content);
    }

    const docs = await retriever.invoke(question);
    if (!docs?.length) {
      console.log("[LLM] 纯模型回答（RAG 无检索结果）");
      const messages = toLangChainMessages(chatHistory ?? []);
      messages.push(new HumanMessage(question));
      const res = await model.invoke(messages);
      return typeof res.content === "string" ? res.content : String(res.content);
    }

    console.log("[RAG] 检索增强回答（命中文档数）:", docs.length);
    const context = formatDocs(docs);
    const historyContext = buildHistoryContext(chatHistory ?? []);
    const ragPrompt = ChatPromptTemplate.fromTemplate(RAG_TEMPLATE);
    const chain = ragPrompt.pipe(model).pipe(new StringOutputParser());
    return await chain.invoke({
      context,
      question,
      history_context: historyContext,
    });
  } catch (e) {
    const err = e as Error;
    console.error("[smartAnswer] 调用失败:", err?.message ?? String(e));
    if (err?.stack) console.error(err.stack);
    return getFallbackResponse(question, chatHistory);
  }
}
