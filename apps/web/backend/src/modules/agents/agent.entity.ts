import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("agents")
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ name: "password_hash" })
  passwordHash: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
