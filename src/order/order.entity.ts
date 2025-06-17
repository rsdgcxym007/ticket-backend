import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column()
  orderId: string; // public-facing id like ORDER1234

  @Column()
  zone: string;

  @Column()
  seats: string;

  @Column()
  total: number;

  @Column()
  method: string;

  @Column({ nullable: true })
  slipPath?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: OrderStatus;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;
}
