import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
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
}
