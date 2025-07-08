import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../order/order.entity';

@Entity()
export class Referrer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @OneToMany(() => Order, (order) => order.referrer)
  orders: Order[];

  @Column({ nullable: true })
  note?: string;

  @Column({ default: true })
  status: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  totalCommission: number;

  @Column({ nullable: true })
  phone?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
