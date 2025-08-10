import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOutstandingAmountToOrder1720700000000
  implements MigrationInterface
{
  name = 'AddOutstandingAmountToOrder1720700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'order',
      new TableColumn({
        name: 'outstandingAmount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
        comment: 'ยอดค้างจริงที่กำหนดเอง (สำหรับแสดงในรายงาน)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('order', 'outstandingAmount');
  }
}
