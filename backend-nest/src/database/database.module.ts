import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { AppConfigService } from '../config/config.service';

@Global()
@Module({
  providers: [DatabaseService, AppConfigService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
