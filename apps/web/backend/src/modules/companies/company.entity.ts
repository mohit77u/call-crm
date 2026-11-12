import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: "client_code", unique: true })
  clientCode: string;

  @Column({ type: "jsonb" })
  features: Record<string, unknown>;

  @Column({ type: "varchar", nullable: true })
  plan: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
