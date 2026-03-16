import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListConversationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit 至少为 1' })
  @Max(100, { message: 'limit 最多为 100' })
  limit?: number = 20;
}
