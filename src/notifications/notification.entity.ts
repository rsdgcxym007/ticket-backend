import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum NotificationType {
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_EXPIRING = 'ORDER_EXPIRING',
  SEAT_AVAILABLE = 'SEAT_AVAILABLE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  PROMOTIONAL = 'PROMOTIONAL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
