import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeatService } from '../seats/seat.service';
import { ZoneService } from '../zone/zone.service';
import { INestApplicationContext } from '@nestjs/common';

async function bootstrap() {
  const app: INestApplicationContext =
    await NestFactory.createApplicationContext(AppModule);

  const seatService = app.get(SeatService);
  const zoneService = app.get(ZoneService);

  const zones = await zoneService.findAll();

  for (const zone of zones) {
    const { seatMap, id: zoneId, name } = zone;

    if (!Array.isArray(seatMap)) {
      console.warn(`❌ seatMap for zone "${name}" is invalid or not an array`);
      continue;
    }

    const bulkSeats = [];

    for (let rowIndex = 0; rowIndex < seatMap.length; rowIndex++) {
      const row = seatMap[rowIndex];
      if (!Array.isArray(row)) continue;

      for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
        const seatNumber = row[columnIndex]; // may be string or null

        bulkSeats.push({
          seatNumber: seatNumber ?? null,
          rowIndex,
          columnIndex,
          status: seatNumber ? 'AVAILABLE' : 'EMPTY', // distinguish usable seat vs gap
          zoneId,
        });
      }
    }

    if (bulkSeats.length > 0) {
      console.log(`🚀 Seeding ${bulkSeats.length} seats for zone "${name}"`);

      for (const s of bulkSeats) {
        await seatService.create(s);
      }

      const emptyCount = bulkSeats.filter((s) => s.status === 'EMPTY').length;
      const availableCount = bulkSeats.filter(
        (s) => s.status === 'AVAILABLE',
      ).length;

      console.log(
        `✅ Done zone "${name}": ${availableCount} AVAILABLE, ${emptyCount} EMPTY`,
      );
    } else {
      console.log(`⚠️ No valid seats found for zone "${name}"`);
    }
  }

  console.log('🎉 All zones seeded successfully');
  await app.close();
}

bootstrap();
