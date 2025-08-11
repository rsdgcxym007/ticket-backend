import { Module } from '@nestjs/common';
import { PWAService } from './pwa.service';
import { PWAController } from './pwa.controller';

@Module({
  controllers: [PWAController],
  providers: [PWAService],
  exports: [PWAService],
})
export class PWAModule {}
