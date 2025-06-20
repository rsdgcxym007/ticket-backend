import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Seat } from '../seats/seat.entity';
import { Order } from '../order/order.entity';

export enum BookingStatus {
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  AVAILABLE = 'AVAILABLE',
}

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

  @Column({ type: 'date' })
  showDate: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.BOOKED })
  status: BookingStatus;
}
