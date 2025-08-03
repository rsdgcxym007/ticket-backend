import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceStatusToOrder1704629000000
  implements MigrationInterface
{
  name = 'AddAttendanceStatusToOrder1704629000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."order_attendancestatus_enum" AS ENUM('PENDING', 'CHECKED_IN', 'NO_SHOW')
    `);
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD "attendanceStatus" "public"."order_attendancestatus_enum" NOT NULL DEFAULT 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "attendanceStatus"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_attendancestatus_enum"`);
  }
}
