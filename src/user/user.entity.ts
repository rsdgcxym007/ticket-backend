import { Payment } from '../payment/payment.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['email'])
export class User {
  @Column({ nullable: true })
  password: string;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 'user' })
  role: 'user' | 'admin' | 'staff';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @Column({ nullable: true })
  userId: string;
}
