// order.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
}
