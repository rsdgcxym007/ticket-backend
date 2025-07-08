import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { AppModule } from '../app.module';
import { SeatStatus } from '../common/enums';
import { Repository, Not } from 'typeorm';
import { Seat } from '../seats/seat.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * 🔧 Script สำหรับ reset สถานะที่นั่งที่ติดค้างจากระบบเก่า
 * รัน: npm run script:reset-seat-status
 *
 * จะทำการ:
 * 1. Reset ที่นั่งทั้งหมดให้เป็น AVAILABLE (ยกเว้น EMPTY)
 * 2. การจองจริงให้ดูจาก seat_booking table
 */

async function resetSeatStatus() {
  const app: INestApplicationContext =
    await NestFactory.createApplicationContext(AppModule);

  console.log('🔧 Starting seat status reset...');

  try {
    const seatRepo = app.get<Repository<Seat>>(getRepositoryToken(Seat));

    // ดึงที่นั่งทั้งหมดที่ไม่ใช่ EMPTY
    const seats = await seatRepo.find({
      where: {
        status: Not(SeatStatus.EMPTY),
      },
    });

    console.log(`📊 Found ${seats.length} seats to reset`);

    let resetCount = 0;

    for (const seat of seats) {
      if (seat.status !== SeatStatus.AVAILABLE) {
        await seatRepo.update(seat.id, { status: SeatStatus.AVAILABLE });
        resetCount++;
        console.log(
          `✅ Reset seat ${seat.seatNumber} from ${seat.status} to AVAILABLE`,
        );
      }
    }

    console.log(
      `🎉 Reset completed! ${resetCount} seats were reset to AVAILABLE`,
    );
    console.log(
      '📝 Note: Actual booking status will be determined by seat_booking table',
    );
  } catch (error) {
    console.error('❌ Error resetting seat status:', error);
  } finally {
    await app.close();
  }
}

// เรียกใช้ script
resetSeatStatus().catch(console.error);
