import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

const ALLOWED_SIZES = ['1024*1024', '720*1280', '1280*720', '768*1344', '1344*768'] as const;

export class Text2ImageRequestDto {
  @IsString({ message: 'prompt 必填' })
  @MaxLength(2000, { message: 'prompt 不得超过 2000 字符' })
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'negative_prompt 不得超过 500 字符' })
  negative_prompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'n 至少为 1' })
  @Max(4, { message: 'n 最多为 4' })
  n?: number = 1;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SIZES, { message: `size 须为: ${ALLOWED_SIZES.join(', ')}` })
  size?: string = '1024*1024';
}
