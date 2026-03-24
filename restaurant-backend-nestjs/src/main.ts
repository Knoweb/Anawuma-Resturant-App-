import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

const isPrivateIpv4 = (hostname: string): boolean => {
  return (
    /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const shouldAllowOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean => {
  if (!origin) {
    return true;
  }

  // If allowedOrigins is empty or contains '*', allow all.
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    const hostname = parsedOrigin.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // Allow frontend dev servers from local/private-network hosts on port 3001.
    if ((isLocalhost || isPrivateIpv4(hostname)) && parsedOrigin.port === '3001') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
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
