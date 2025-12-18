import { Module } from '@nestjs/common';
import { FreeswitchService } from './freeswitch.service';
import { FreeswitchController } from './freeswitch.controller';
import { EslService } from './esl.service';

@Module({
  controllers: [FreeswitchController],
  providers: [FreeswitchService, EslService],
  exports: [FreeswitchService, EslService],
})
export class FreeswitchModule {}
