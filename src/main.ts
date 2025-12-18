import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(port);
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 FusionPBX API Server                                 ║
║                                                            ║
║   Server running on: http://localhost:${port}                ║
║   API endpoint: http://localhost:${port}/${apiPrefix}           ║
║                                                            ║
║   📚 Available endpoints:                                 ║
║      POST   /${apiPrefix}/auth/login                          ║
║      GET    /${apiPrefix}/domains                             ║
║      GET    /${apiPrefix}/extensions                          ║
║      GET    /${apiPrefix}/gateways                            ║
║      GET    /${apiPrefix}/dialplans                           ║
║      GET    /${apiPrefix}/ring-groups                         ║
║      POST   /${apiPrefix}/freeswitch/reload                   ║
║                                                            ║
║   🔐 Test credentials:                                    ║
║      Username: admin                                       ║
║      Password: admin                                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
