import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 单条历史消息校验 */
export class ChatMessageItemDto {
  @IsString()
  @MaxLength(20000, { message: '单条历史消息过长' })
  content!: string;

  @IsString()
  @IsIn(['user', 'assistant', 'system'], { message: 'role 须为 user/assistant/system' })
  role!: string;
}

/** 聊天请求体：消息长度、历史条数由全局 ValidationPipe 校验，更严限制见配置 MAX_MESSAGE_LENGTH / MAX_CHAT_HISTORY_LENGTH */
export class ChatRequestDto {
  @IsString({ message: 'message 必填且为字符串' })
  @MaxLength(15000, { message: '单条消息不得超过 15000 字符' })
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'chat_history 最多 50 条' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageItemDto)
  chat_history?: ChatMessageItemDto[];
}
