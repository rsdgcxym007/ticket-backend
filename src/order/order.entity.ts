import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderId: string;

  @Column()
  zone: string;

  @Column()
  seats: string;

  @Column('decimal')
  total: number;

  @Column()
  method: string;

  @Column({ nullable: true })
  slipPath?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: OrderStatus;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;
}
