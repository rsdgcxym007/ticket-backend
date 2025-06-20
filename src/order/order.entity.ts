import { Payment } from 'src/payment/payment.entity';
import { Referrer } from 'src/referrer/referrer.entity';
import { Seat } from 'src/seats/seat.entity';
import { User } from 'src/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum OrderMethod {
  QR = 'QR',
  TRANSFER = 'TRANSFER',
  CASH = 'CASH',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ nullable: true })
  referrerCode?: string;

  @Column({ type: 'decimal' })
  total: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: OrderMethod,
    default: OrderMethod.QR,
  })
  method: OrderMethod;

  @OneToMany(() => Seat, (seat) => seat.order, {
    cascade: true,
  })
  seats: Seat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @ManyToOne(() => Referrer, (ref) => ref.orders, { nullable: true })
  referrer: Referrer;

  @Column({ type: 'int', default: 0 })
  referrerCommission: number;

  @OneToMany(() => Payment, (payment) => payment.order, { cascade: true })
  payments: Payment[];

  @Column({ type: 'date' })
  showDate: Date;
}
