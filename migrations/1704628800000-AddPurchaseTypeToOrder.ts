import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseTypeToOrder1704628800000 implements MigrationInterface {
  name = 'AddPurchaseTypeToOrder1704628800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type first
    await queryRunner.query(`
      CREATE TYPE "public"."order_purchasetype_enum" AS ENUM('WEBSITE', 'BOOKING', 'ONSITE')
    `);

    // Add the column with the enum type and default value
    await queryRunner.query(`
      ALTER TABLE "order" 
      ADD "purchaseType" "public"."order_purchasetype_enum" NOT NULL DEFAULT 'ONSITE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the column
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "purchaseType"`);

    // Drop the enum type
    await queryRunner.query(`DROP TYPE "public"."order_purchasetype_enum"`);
  }
}
