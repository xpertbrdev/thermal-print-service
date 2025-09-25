import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Habilitar CORS
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🖨️  Microservice de Impressão Térmica rodando na porta ${port}`);
  console.log(`📋 Documentação da API: http://localhost:${port}/print/health`);
}
bootstrap();
