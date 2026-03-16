import { Module } from '@nestjs/common';
import { MultimodalService } from './multimodal.service';
import { MultimodalController } from './multimodal.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { AppConfigService } from '../config/config.service';
import { ConcurrencyService } from '../common/concurrency.service';
import { MultimodalImageSizeGuard } from '../common/guards/image-size.guard';
import { ConcurrencyGuard } from '../common/guards/concurrency.guard';
import { ConcurrencyReleaseInterceptor } from '../common/concurrency-release.interceptor';

@Module({
  imports: [ConversationModule],
  providers: [
    MultimodalService,
    AppConfigService,
    ConcurrencyService,
    MultimodalImageSizeGuard,
    ConcurrencyGuard,
    ConcurrencyReleaseInterceptor,
  ],
  controllers: [MultimodalController],
})
export class MultimodalModule {}

