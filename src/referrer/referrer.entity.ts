import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from 'src/order/order.entity';

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

  @Column({ default: 0 })
  totalCommission: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
