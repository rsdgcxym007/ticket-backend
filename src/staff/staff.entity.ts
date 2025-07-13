import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum StaffRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  SUPERVISOR = 'supervisor',
}

export enum StaffPermission {
  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',

  // Staff Management
  MANAGE_STAFF = 'manage_staff',
  VIEW_STAFF = 'view_staff',

  // Order Management
  MANAGE_ORDERS = 'manage_orders',
  CANCEL_ORDERS = 'cancel_orders',
  REFUND_ORDERS = 'refund_orders',

  // System
  SYSTEM_SETTINGS = 'system_settings',
  AUDIT_LOGS = 'audit_logs',

  // Performance
  VIEW_PERFORMANCE = 'view_performance',
  SYSTEM_MONITORING = 'system_monitoring',
}

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  staffCode: string; // รหัสพนักงาน

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: StaffRole,
    default: StaffRole.STAFF,
  })
  role: StaffRole;

  @Column({
    type: 'enum',
    enum: StaffStatus,
    default: StaffStatus.ACTIVE,
  })
  status: StaffStatus;

  @Column('json', { nullable: true })
  permissions: StaffPermission[];

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  position: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary: number;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isActive(): boolean {
    return this.status === StaffStatus.ACTIVE;
  }
}
