import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsIn,
  IsBase64,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MultimodalMessageItemDto {
  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsString()
  @IsIn(['user', 'assistant', 'system'])
  role!: string;
}

/** 多模态请求：message + base64 图片，图片大小在 Guard 中按字节校验 */
export class MultimodalRequestDto {
  @IsString()
  @MaxLength(5000, { message: '多模态消息文本不得超过 5000 字符' })
  message!: string;

  @IsString({ message: 'image_data (base64) 必填' })
  @IsBase64()
  image_data!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MultimodalMessageItemDto)
  chat_history?: MultimodalMessageItemDto[];
}
