import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailAutomationController } from './email-automation.controller';
import { EmailAutomationService } from './email-automation.service';
import { QRCodeService } from '../common/services/qr-code.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule, // For authentication guards
  ],
  controllers: [EmailAutomationController],
  providers: [EmailAutomationService, QRCodeService],
  exports: [EmailAutomationService],
})
export class EmailModule {}
