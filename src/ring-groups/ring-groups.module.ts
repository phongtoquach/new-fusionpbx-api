import { Module } from '@nestjs/common';
import { RingGroupsService } from './ring-groups.service';
import { RingGroupsController } from './ring-groups.controller';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [FreeswitchModule],
  controllers: [RingGroupsController],
  providers: [RingGroupsService],
  exports: [RingGroupsService],
})
export class RingGroupsModule {}
