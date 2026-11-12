import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("password_resets")
export class PasswordReset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column() // 'admin' | 'superadmin'
  role: string;

  @Column({ name: "token_hash", unique: true })
  tokenHash: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
