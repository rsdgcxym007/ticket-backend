import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'jsonb', nullable: false })
  seatMap: string[][];

  @Column({ default: true })
  isActive: boolean;
}
