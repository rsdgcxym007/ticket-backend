import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditAction, UserRole } from '../common/enums';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId', 'timestamp'])
@Index(['action', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ length: 100 })
  entityType: string;

  @Column({ length: 100 })
  entityId: string;

  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'enum', enum: UserRole })
  userRole: UserRole;

  @Column({ type: 'text', nullable: true })
  oldData?: string;

  @Column({ type: 'text', nullable: true })
  newData?: string;

  @Column({ type: 'text', nullable: true })
  metadata?: string;

  @Column({ length: 45, nullable: true })
  ipAddress?: string;

  @Column({ length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
