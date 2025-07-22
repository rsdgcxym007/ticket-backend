import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { PaymentMethod, PaymentStatus } from '../common/enums';

@Entity()
@Index(['userId'])
@Index(['orderId'])
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
