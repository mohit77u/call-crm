import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("leads")
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "assigned_agent_id", type: "int", nullable: true })
  assignedAgentId: number | null;

  @Column({ name: "requested_by_agent_id", type: "int", nullable: true })
  requestedByAgentId: number | null;

  @Column({ name: "created_by_type" })
  createdByType: "agent" | "admin";

  @Column({ name: "created_by_id", type: "int" })
  createdById: number;

  @Column({ default: "request" })
  source: "request" | "manual" | "import";

  @Column()
  name: string;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ type: "varchar", nullable: true })
  email: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ default: "new" })
  status: string;

  @Column({ name: "account_created", default: false })
  accountCreated: boolean;

  @Column({ name: "request_status", type: "varchar", nullable: true })
  requestStatus: "pending" | "approved" | "rejected" | null;

  @Column({ name: "assigned_at", type: "timestamptz", nullable: true })
  assignedAt: Date | null;

  @Column({ name: "last_contacted_at", type: "timestamptz", nullable: true })
  lastContactedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
