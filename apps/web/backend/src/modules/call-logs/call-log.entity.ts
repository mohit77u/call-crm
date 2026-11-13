import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("call_logs")
export class CallLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "agent_id" })
  agentId: number;

  @Column({ name: "device_id" })
  deviceId: number;

  @Column({ name: "local_id" })
  localId: string;

  @Column({ name: "phone_number" })
  phoneNumber: string;

  @Column({ name: "contact_name", type: "varchar", nullable: true })
  contactName: string | null;

  @Column({ name: "call_type" })
  callType: string;

  @Column()
  status: string;

  @Column({ name: "started_at", type: "timestamptz" })
  startedAt: Date;

  @Column({ name: "duration_sec", default: 0 })
  durationSec: number;

  @Column({ type: "varchar", nullable: true })
  sim: string | null;

  @Column({ name: "sim_details", type: "jsonb", nullable: true })
  simDetails: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
