import { Module } from '@nestjs/common';
import { DialplansService } from './dialplans.service';
import { DialplansController } from './dialplans.controller';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [FreeswitchModule],
  controllers: [DialplansController],
  providers: [DialplansService],
  exports: [DialplansService],
})
export class DialplansModule {}
