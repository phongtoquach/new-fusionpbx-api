import { Module } from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { ExtensionsController } from './extensions.controller';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [FreeswitchModule],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService]
})
export class ExtensionsModule {}
