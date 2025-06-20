import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from 'src/order/order.entity';

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

  @ManyToOne(() => Order, (order) => order.payments, {
    onDelete: 'CASCADE',
  })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;
}
