import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://boxing-ticket-frontend.vercel.app',
      'https://boxing-ticket-frontend-cj9x.vercel.app',
    ],
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/slips',
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
