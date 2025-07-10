import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Zone } from '../zone/zone.entity';
import { SeatStatus } from '../common/enums';
import { Index } from 'typeorm';
import { Order } from '../order/order.entity';
import { SeatBooking } from './seat-booking.entity';

@Index(['zone', 'rowIndex', 'columnIndex'])
@Entity()
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  seatNumber: string | null;

  @Column({ type: 'int' })
  rowIndex: number;

  @Column({ type: 'int' })
  columnIndex: number;

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @ManyToOne(() => Zone, (zone) => zone.seats, { onDelete: 'CASCADE' })
  zone: Zone;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  isLockedUntil?: Date;

  @ManyToOne(() => Order, (order) => order.seats, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  order: Order;

  @OneToMany(() => SeatBooking, (booking) => booking.seat)
  bookings: SeatBooking[];
}
