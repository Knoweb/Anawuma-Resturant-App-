import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS with dynamic whitelisting from environment
  const corsOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  // Ensure standard fallbacks are included
  const standardOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://152.42.179.36',
    'https://anawuma.com',
    'https://www.anawuma.com',
    'http://anawuma.com',
    'http://www.anawuma.com',
  ];
  for (const origin of standardOrigins) {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Ensure uploads directory and subdirectories exist
  const uploadsDir = join(__dirname, '..', 'uploads');
  const subdirs = ['food-items', 'categories', 'menus', 'offers', 'logos', 'restaurants'];
  for (const sub of subdirs) {
    const fullPath = join(uploadsDir, sub);
    if (!require('fs').existsSync(fullPath)) {
      require('fs').mkdirSync(fullPath, { recursive: true });
    }
  }

  // Serve static files from uploads directory
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });
  
  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`🚀 NestJS Application is running on: http://${host}:${port}/api`);
}
bootstrap();
