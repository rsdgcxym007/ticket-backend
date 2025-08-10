import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImportTrackingToOrder1737275201000
  implements MigrationInterface
{
  name = 'AddImportTrackingToOrder1737275201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'order',
      new TableColumn({
        name: 'lastImportProcessedAt',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'order',
      new TableColumn({
        name: 'importProcessCount',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('order', 'importProcessCount');
    await queryRunner.dropColumn('order', 'lastImportProcessedAt');
  }
}
