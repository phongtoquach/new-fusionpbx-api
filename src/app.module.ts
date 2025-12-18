import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { FreeswitchModule } from './freeswitch/freeswitch.module';
import { DomainsModule } from './domains/domains.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { GatewaysModule } from './gateways/gateways.module';
import { DialplansModule } from './dialplans/dialplans.module';
import { RingGroupsModule } from './ring-groups/ring-groups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    FreeswitchModule,
    DomainsModule,
    ExtensionsModule,
    GatewaysModule,
    DialplansModule,
    RingGroupsModule,
  ],
})
export class AppModule {}
