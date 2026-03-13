import { Module } from '@nestjs/common';
import { MultimodalService } from './multimodal.service';
import { MultimodalController } from './multimodal.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [ConversationModule],
  providers: [MultimodalService, AppConfigService],
  controllers: [MultimodalController],
})
export class MultimodalModule {}

