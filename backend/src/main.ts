import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT') ?? '3001', 10);
  const frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:8080'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Online Games API')
    .setDescription('REST API for online card games')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
