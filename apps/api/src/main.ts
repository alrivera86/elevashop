import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS - Permitir acceso desde cualquier origen
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Elevashop API')
    .setDescription('API del sistema de gestión Elevashop/Elevapartes')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y autorización')
    .addTag('productos', 'Gestión de productos')
    .addTag('inventario', 'Control de inventario')
    .addTag('ventas', 'Gestión de ventas')
    .addTag('clientes', 'Gestión de clientes')
    .addTag('importaciones', 'Control de importaciones')
    .addTag('finanzas', 'Gastos y finanzas')
    .addTag('reportes', 'Reportes y estadísticas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Elevashop API corriendo en: http://0.0.0.0:${port}`);
  console.log(`📚 Documentación Swagger: http://82.25.74.175:${port}/api/docs`);
}

bootstrap();
