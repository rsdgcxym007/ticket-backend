import { User } from '../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  providerId: string;

  @Column()
  password: string;

  @Column()
  provider: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 'user' }) // roles: user, staff, admin
  role: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' }) // สมมุติว่าใช้ user.id
  user: User;

  @Column({ nullable: true })
  userId: string;
}
