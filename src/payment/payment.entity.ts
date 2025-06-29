import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Order } from 'src/order/order.entity';
import { User } from 'src/user/user.entity';

export enum PaymentMethod {
  QR = 'QR',
  TRANSFER = 'TRANSFER',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'decimal' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PAID })
  status: PaymentStatus;

  @Column({ nullable: true })
  slipUrl?: string;

  @Column({ nullable: true })
  userId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ nullable: true })
  orderId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  paidAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ nullable: true })
  createdById?: string;

  @OneToOne(() => Order, (order) => order.payment, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User, (user) => user.payments, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
