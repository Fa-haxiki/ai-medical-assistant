import { Injectable, Logger } from '@nestjs/common';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AppConfigService } from '../config/config.service';
import { RagService } from '../rag/rag.service';
import { RerankService } from '../rag/rerank.service';
import { ChatMessage } from './chat.types';
import { SYSTEM_PROMPT, RAG_TEMPLATE } from '../prompts';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly ragService: RagService,
    private readonly rerankService: RerankService,
  ) {}

  private buildHistoryContext(chatHistory: ChatMessage[]): string {
    if (!chatHistory?.length) return '';
    const recent = chatHistory.slice(-5);
    let out = '\n\n聊天历史:\n';
    for (const msg of recent) {
      const roleName = msg.role === 'user' ? '用户' : 'AI医疗助手';
      out += `${roleName}: ${msg.content}\n`;
    }
    return out;
  }

  private toLangChainMessages(chatHistory: ChatMessage[]): BaseMessage[] {
    const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];
    const recent =
      chatHistory?.length > 10 ? chatHistory.slice(-10) : chatHistory ?? [];
    for (const msg of recent) {
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    }
    return messages;
  }

  private createChatModel(modelName: string): ChatAlibabaTongyi {
    return new ChatAlibabaTongyi({
      alibabaApiKey: this.config.dashscopeApiKey,
      model: modelName,
      modelName,
    });
  }

  private trimContextByBudget(context: string): string {
    const maxChars = this.config.ragContextMaxChars;
    if (context.length <= maxChars) return context;
    return context.slice(0, maxChars);
  }

  async smartAnswer(
    question: string,
    chatHistory: ChatMessage[] = [],
    modelName?: string,
  ): Promise<string> {
    try {
      const resolvedModelName = modelName ?? this.config.chatModelName;
      const model = this.createChatModel(resolvedModelName);
      const retriever = this.ragService.getRetriever();
      this.logger.log(
        `[smartAnswer] 调用模型: ${resolvedModelName}`,
      );

      if (!retriever) {
        this.logger.log('[LLM] 纯模型回答（RAG 未启用）');
        const messages = this.toLangChainMessages(chatHistory);
        messages.push(new HumanMessage(question));
        const res = await model.invoke(messages);
        return typeof res.content === 'string'
          ? res.content
          : String(res.content);
      }

      const docs = await retriever.invoke(question);
      if (!docs?.length) {
        this.logger.log('[LLM] 纯模型回答（RAG 无检索结果）');
        const messages = this.toLangChainMessages(chatHistory);
        messages.push(new HumanMessage(question));
        const res = await model.invoke(messages);
        return typeof res.content === 'string'
          ? res.content
          : String(res.content);
      }

      const rerankStartedAt = Date.now();
      const rerankedDocs = await this.rerankService.rerank(question, docs);
      const rerankLatency = Date.now() - rerankStartedAt;
      this.logger.log(
        `[RAG] 检索增强回答（召回/重排后）: ${docs.length}/${rerankedDocs.length}, rerank耗时: ${rerankLatency}ms`,
      );
      const rawContext = this.ragService.formatDocs(rerankedDocs);
      const context = this.trimContextByBudget(rawContext);
      this.logger.log(`[RAG] 最终上下文长度: ${context.length}`);
      const historyContext = this.buildHistoryContext(chatHistory);
      const ragPrompt = ChatPromptTemplate.fromTemplate(RAG_TEMPLATE);
      const chain = ragPrompt.pipe(model).pipe(new StringOutputParser());
      return await chain.invoke({
        context,
        question,
        history_context: historyContext,
      });
    } catch (e) {
      const err = e as Error;
      this.logger.error(
        `[smartAnswer] 调用失败: ${err?.message ?? String(e)}`,
      );
      if (err?.stack) this.logger.error(err.stack);
      return this.config.chatFallbackGeneralTemplate;
    }
  }
}

