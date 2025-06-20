import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Zone } from 'src/zone/zone.entity';
import { SeatStatus } from './eat-status.enum';
import { Index } from 'typeorm';
import { Order } from 'src/order/order.entity';

@Index(['zone', 'rowIndex', 'columnIndex'])
@Entity()
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  seatNumber: string;

  @Column({ type: 'int' })
  rowIndex: number;

  @Column({ type: 'int' })
  columnIndex: number;

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @ManyToOne(() => Zone, (zone: any) => zone.seats, { onDelete: 'CASCADE' })
  zone: Zone;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  isLockedUntil?: Date;

  @ManyToOne(() => Order, (order) => order.seats, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  order: Order;
}
