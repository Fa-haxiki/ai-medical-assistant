import axios from 'axios';

// 定义Message类型
export interface Message {
  role: string;
  content: string;
  timestamp?: string;
  image_url?: string;  // 添加图片URL字段
  isTemporary?: boolean; // 标记是否为临时消息
}

// API基础URL
const API_BASE_URL = 'http://localhost:8000/api';

// 定义请求类型
export interface ChatRequest {
  message: string;
  chat_history?: any[];
}

// 定义多模态请求类型
export interface MultiModalChatRequest {
  message: string;
  chat_history?: any[];
  image_data?: string;  // Base64编码的图片数据
}

// 文生图请求类型
export interface TextToImageRequest {
  prompt: string;
  negative_prompt?: string;
  n?: number;
  size?: string;
}

// 文生图响应类型
export interface TextToImageResponse {
  image_urls: string[];
  conversation_id: string;
}

// 发送普通消息（非流式）
export async function sendMessage(
  message: string, 
  conversationId?: string,
  chatHistory?: any[],
  useStream: boolean = false,
  onTokenReceived?: (token: string) => void,
  onImageReceived?: (imageUrl: string) => void
): Promise<{ content: string, conversationId: string, image_url?: string }> {
  console.log(`发送消息: '${message}', conversationId: ${conversationId || '新会话'}, 历史消息数: ${chatHistory?.length || 0}, 使用流式响应: ${useStream}`);
  
  if (useStream) {
    return sendStreamMessage(message, conversationId, chatHistory, onTokenReceived, onImageReceived);
  }
  
  try {
    // 构建请求对象
    const request: ChatRequest = {
      message,
      chat_history: chatHistory || []
    };
    
    // 设置请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 如果有会话ID，添加到URL参数
    let url = `${API_BASE_URL}/chat`;
    if (conversationId) {
      url += `?conversation_id=${conversationId}`;
    }
    
    console.log(`发送POST请求到: ${url}`);
    
    // 发送请求
    const response = await axios.post(url, request, { headers });
    
    // 构建返回对象
    const result: { 
      content: string, 
      conversationId: string,
      image_url?: string 
    } = {
      content: response.data.response,
      conversationId: response.data.conversation_id
    };
    
    // 如果响应中包含图片URL
    if (response.data.image_url) {
      result.image_url = response.data.image_url;
    }
    
    return result;
  } catch (error) {
    console.error(`发送消息失败:`, error);
    throw error;
  }
}

// 使用表单发送多模态消息（图片+文本）
export async function sendMultiModalMessage(
  message: string,
  imageFile: File,
  conversationId?: string,
  chatHistory?: any[]
) {
  try {
    console.log(`发送多模态消息: '${message}', 图片: ${imageFile.name}, conversationId: ${conversationId || '新会话'}, 历史消息数: ${chatHistory?.length || 0}`);
    
    // 构建FormData
    const formData = new FormData();
    formData.append('message', message);
    formData.append('file', imageFile);
    
    // 如果有会话ID，添加到URL参数
    let url = `${API_BASE_URL}/chat/multimodal`;
    if (conversationId) {
      url += `?conversation_id=${conversationId}`;
    }
    
    console.log(`发送多模态请求到: ${url}`);
    
    // 发送请求
    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    console.log('多模态响应:', response.data);
    
    return {
      content: response.data.response,
      conversationId: response.data.conversation_id
    };
  } catch (error) {
    console.error(`发送多模态消息失败:`, error);
    throw error;
  }
}

// 使用JSON发送多模态消息（Base64图片+文本）
export async function sendMultiModalJsonMessage(
  message: string,
  imageData: string,
  conversationId?: string,
  chatHistory?: any[]
): Promise<{ content: string, conversationId: string, image_url?: string }> {
  try {
    console.log(`发送多模态JSON消息: '${message}', 图片数据长度: ${imageData.length}, conversationId: ${conversationId || '新会话'}, 历史消息数: ${chatHistory?.length || 0}`);
    
    // 确保图片 base64 数据格式正确
    let processedImageData = imageData;
    if (imageData.startsWith('data:')) {
      // 已经是正确格式，保持不变
      console.log('图片数据已包含 data URI 前缀');
    } else {
      // 添加 data URI 前缀
      processedImageData = `data:image/jpeg;base64,${imageData}`;
      console.log('已添加 data URI 前缀到图片数据');
    }
    
    // 确保聊天历史中每个消息对象都有role和content字段
    const sanitizedChatHistory = chatHistory ? chatHistory.map(msg => {
      // 确保消息有必要的字段
      if (typeof msg === 'object' && msg !== null) {
        return {
          role: msg.role || 'user',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString()
        };
      }
      // 跳过无效消息
      console.warn('跳过无效历史消息', msg);
      return null;
    }).filter(Boolean) : [];
    
    // 构建请求对象
    const request: MultiModalChatRequest = {
      message,
      chat_history: sanitizedChatHistory,
      image_data: processedImageData
    };
    
    // 如果有会话ID，添加到URL参数
    let url = `${API_BASE_URL}/chat/multimodal-json`;
    if (conversationId) {
      url += `?conversation_id=${conversationId}`;
    }
    
    console.log(`发送多模态JSON请求到: ${url}`);
    console.log(`请求历史消息数: ${sanitizedChatHistory.length}`);
    
    // 发送请求
    const response = await axios.post(url, request, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('多模态JSON响应:', response.data);
    
    // 确保响应内容是字符串
    let content = '';
    if (response.data && response.data.response) {
      if (typeof response.data.response === 'string') {
        content = response.data.response;
      } else {
        // 如果响应不是字符串，尝试转换
        try {
          content = JSON.stringify(response.data.response);
        } catch (err) {
          console.error('响应内容转换失败:', err);
          content = '收到响应，但格式无法处理。';
        }
      }
    } else {
      content = '未收到有效响应。';
    }
    
    // 构建返回对象
    const result: { 
      content: string, 
      conversationId: string,
      image_url?: string 
    } = {
      content: content,
      conversationId: response.data.conversation_id || conversationId || ''
    };
    
    // 如果响应中包含图片URL
    if (response.data.image_url) {
      result.image_url = response.data.image_url;
    }
    
    return result;
  } catch (error) {
    console.error(`发送多模态JSON消息失败:`, error);
    throw error;
  }
}

// 发送流式消息：单次 POST，后端直接返回 SSE 流，避免 GET 会话 id 不一致
export async function sendStreamMessage(
  message: string,
  conversationId?: string,
  chatHistory?: any[],
  onTokenReceived?: (token: string) => void,
  _onImageReceived?: (imageUrl: string) => void
): Promise<{ content: string; conversationId: string; image_url?: string }> {
  let receivedContent = '';
  let receivedConversationId = conversationId || '';

  const url = new URL(`${API_BASE_URL}/chat/stream`);
  if (conversationId) url.searchParams.set('conversation_id', conversationId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, chat_history: chatHistory || [] }),
  });

  if (!res.ok) {
    throw new Error(`流式请求失败: ${res.status}`);
  }
  if (!res.body) {
    throw new Error('无响应体');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:') && currentEvent) {
        const raw = line.slice(5).trim();
        // message 事件：后端用 JSON 编码以保留换行/空格，需 parse 还原
        const data =
          currentEvent === 'message'
            ? (() => {
                try {
                  return JSON.parse(raw) as string;
                } catch {
                  return raw;
                }
              })()
            : raw;
        if (currentEvent === 'message') {
          receivedContent += data;
          onTokenReceived?.(data);
        } else if (currentEvent === 'done') {
          try {
            const parsed = JSON.parse(data) as { conversation_id?: string; image_url?: string };
            if (parsed.conversation_id) receivedConversationId = parsed.conversation_id;
            return {
              content: receivedContent,
              conversationId: receivedConversationId,
              image_url: parsed.image_url,
            };
          } catch {
            return { content: receivedContent, conversationId: receivedConversationId };
          }
        }
        currentEvent = '';
      }
    }
  }

  if (buffer.trim()) {
    const lines = buffer.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
      else if (line.startsWith('data:') && currentEvent) {
        const raw = line.slice(5).trim();
        const data =
          currentEvent === 'message'
            ? (() => {
                try {
                  return JSON.parse(raw) as string;
                } catch {
                  return raw;
                }
              })()
            : raw;
        if (currentEvent === 'message') {
          receivedContent += data;
          onTokenReceived?.(data);
        } else if (currentEvent === 'done') {
          try {
            const parsed = JSON.parse(data) as { conversation_id?: string; image_url?: string };
            if (parsed.conversation_id) receivedConversationId = parsed.conversation_id;
            return {
              content: receivedContent,
              conversationId: receivedConversationId,
              image_url: parsed.image_url,
            };
          } catch {
            break;
          }
        }
        currentEvent = '';
      }
    }
  }
  return { content: receivedContent, conversationId: receivedConversationId };
}

// 获取对话历史（404 视为空历史，兼容旧后端或新会话）
export const getChatHistory = async (conversationId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/history/${conversationId}`);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { history: [], conversation_id: conversationId };
    }
    throw err;
  }
};

// 文生图API调用
export async function callTextToImage(
  prompt: string,
  options: {
    negative_prompt?: string;
    n?: number;
    size?: string;
    conversationId?: string;
  } = {}
): Promise<TextToImageResponse> {
  try {
    console.log(`发送文生图请求 - 提示词: '${prompt}', 会话ID: ${options.conversationId || '新会话'}`);
    
    // 构建请求对象
    const request: TextToImageRequest = {
      prompt: prompt
    };
    
    // 添加可选参数
    if (options.negative_prompt) request.negative_prompt = options.negative_prompt;
    if (options.n) request.n = options.n;
    if (options.size) request.size = options.size;
    
    // 设置请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 如果有会话ID，添加到URL参数
    let url = `${API_BASE_URL}/text2image`;
    if (options.conversationId) {
      url += `?conversation_id=${options.conversationId}`;
    }
    
    console.log(`发送文生图POST请求到: ${url}`);
    
    // 发送请求
    const response = await axios.post(url, request, { headers });
    
    console.log('文生图响应:', response.data);
    
    // 返回结果
    return {
      image_urls: response.data.image_urls,
      conversation_id: response.data.conversation_id
    };
  } catch (error) {
    console.error(`文生图请求失败:`, error);
    throw error;
  }
} 

// 上传新的知识文件，写入后端 Chroma 向量库
export async function uploadKnowledgeFile(
  file: File
): Promise<{
  success?: boolean;
  filename?: string;
  chunks?: number;
  message?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_BASE_URL}/knowledge/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('上传知识文件失败:', error);
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    return { error: '上传知识文件失败，请稍后重试。' };
  }
}