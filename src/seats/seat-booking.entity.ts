import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seat } from '../seats/seat.entity';
import { Order } from '../order/order.entity';
import { BookingStatus } from '../common/enums';

@Entity()
export class SeatBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Seat, (seat: any) => seat.bookings, { eager: true })
  seat: Seat;

  @ManyToOne(() => Order, (order: any) => order.seatBookings, {
    onDelete: 'CASCADE',
  })
  order: Order;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ type: 'date' })
  showDate: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.BOOKED })
  status: BookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
