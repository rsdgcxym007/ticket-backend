import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Seat } from '../seats/seat.entity';

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

  @OneToMany(() => Seat, (seat) => seat.zone)
  seats: Seat[];
}
