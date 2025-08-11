import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('user_sessions')
@Index(['userId', 'isActive'])
@Index(['tokenId'])
@Index('IDX_user_sessions_expires_at', ['expiresAt'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  tokenId: string; // JTI (JWT ID) for token identification

  @Column({ type: 'varchar', length: 500 })
  tokenHash: string; // Hashed version of the token for security

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceInfo: string; // Browser/device information

  @Column({ type: 'inet', nullable: true })
  ipAddress: string; // User's IP address

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string; // User agent string

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
