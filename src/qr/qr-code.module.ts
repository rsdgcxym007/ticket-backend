import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QRCodeController } from './qr-code.controller';
import { QRCodeService } from '../common/services/qr-code.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule, // For authentication guards
  ],
  controllers: [QRCodeController],
  providers: [QRCodeService],
  exports: [QRCodeService],
})
export class QRCodeModule {}
