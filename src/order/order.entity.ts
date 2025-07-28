import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  OrderSource,
} from '../common/enums';

@Entity()
@Index(['userId'])
@Index(['orderNumber'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  referrerCode?: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal' })
  total: number;

  @Column({ type: 'decimal' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.QR_CODE,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  method: PaymentMethod;

  @OneToMany(() => Seat, (seat) => seat.order, {
    cascade: true,
  })
  seats: Seat[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @ManyToOne(() => Referrer, (referrer) => referrer.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'referrerId' })
  referrer: Referrer;

  @Column({ nullable: true })
  referrerId: string;

  @Column({ type: 'int', default: 0 })
  referrerCommission: number;

  @OneToOne(() => Payment, (payment) => payment.order, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column({ type: 'date' })
  showDate: Date;

  @OneToMany(() => SeatBooking, (booking) => booking.order, { cascade: true })
  seatBookings: SeatBooking[];

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  slipUrl?: string;

  @Column({ type: 'boolean', default: false })
  slipVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  slipVerifiedAt?: Date;

  @Column({ nullable: true })
  slipVerifiedBy?: string;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ nullable: true })
  refundReason?: string;

  @Column({ type: 'decimal', default: 0 })
  refundAmount: number;

  @Column({ nullable: true })
  specialRequests?: string;

  @Column({ type: 'boolean', default: false })
  requiresPickup: boolean;

  @Column({ type: 'boolean', default: false })
  requiresDropoff: boolean;

  @Column({ nullable: true })
  pickupHotel?: string;

  @Column({ nullable: true })
  dropoffLocation?: string;

  @Column({ nullable: true })
  pickupTime?: string;

  @Column({ nullable: true })
  dropoffTime?: string;

  @Column({ type: 'date', nullable: true })
  travelDate?: Date;

  @Column({ nullable: true })
  voucherCode?: string;

  @Column({ nullable: true })
  referenceNo?: string;

  @Column({
    type: 'enum',
    enum: OrderSource,
    default: OrderSource.DIRECT,
  })
  source: OrderSource;

  @Column({
    type: 'enum',
    enum: TicketType,
    nullable: true,
  })
  ticketType?: TicketType;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @Column({ type: 'int', default: 0 })
  standingAdultQty: number;

  @Column({ type: 'int', default: 0 })
  standingChildQty: number;

  @Column({ type: 'int', default: 0 })
  standingTotal: number;

  @Column({ type: 'int', default: 0 })
  standingCommission: number;

  // ผู้สร้างออเดอร์ (staff/admin หรือ null=ลูกค้า)
  @Column({ nullable: true })
  createdBy?: string;
}
