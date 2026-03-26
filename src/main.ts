import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité HTTP
  app.use(helmet());

  // CORS
  const isProd = process.env.NODE_ENV === 'production';
  const rawAllowedOrigins =
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    'https://piece-rare.ci';
  const allowedOrigins = rawAllowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProd
      ? (
          origin: string | undefined,
          cb: (err: Error | null, allow?: boolean) => void,
        ) => {
          // Allow calls without Origin (curl, server-to-server)
          if (!origin) {
            return cb(null, true);
          }

          if (allowedOrigins.includes(origin)) {
            return cb(null, true);
          }

          return cb(new Error(`CORS blocked for origin: ${origin}`));
        }
      : (
          _origin: string | undefined,
          cb: (err: Error | null, allow?: boolean) => void,
        ) => cb(null, true), // dev : allow all
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Préfixe global API
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('piece-rare.ci API')
    .setDescription(
      "API REST pour la plateforme d'annonces de pièces détachées (Téléphones & PC)",
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentification (register, login, me)')
    .addTag('Users', 'Gestion du profil utilisateur')
    .addTag('Posts', 'CRUD annonces + filtres + pagination')
    .addTag('Admin', 'Administration (validation, modération)')
    .addTag('Upload', "Upload d'images via Cloudinary")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Port : depuis .env ou fallback 4000
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);

  console.log(`🚀 piece-rare.ci API lancée sur http://localhost:${port}`);
  console.log(`📘 Swagger docs : http://localhost:${port}/api/docs`);
}

void bootstrap();
