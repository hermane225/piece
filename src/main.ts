import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité
  app.use(helmet());

  // CORS pour app mobile
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Validation globale
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

  // Préfixe global API
  app.setGlobalPrefix('api', {
    exclude: [''],
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('piece-rare.ci API')
    .setDescription(
      'API REST pour la plateforme d\'annonces de pièces détachées (Téléphones & PC)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentification (register, login, me)')
    .addTag('Users', 'Gestion du profil utilisateur')
    .addTag('Posts', 'CRUD annonces + filtres + pagination')
    .addTag('Admin', 'Administration (validation, modération)')
    .addTag('Upload', 'Upload d\'images via Cloudinary')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 piece-rare.ci API lancée sur http://localhost:${port}`);
  console.log(`📘 Swagger docs : http://localhost:${port}/api/docs`);
}
bootstrap();
