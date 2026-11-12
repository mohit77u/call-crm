import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("devices")
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "agent_id" })
  agentId: number;

  @Column({ type: "varchar", nullable: true })
  model: string | null;

  @Column({ name: "os_version", type: "varchar", nullable: true })
  osVersion: string | null;

  @Column({ name: "app_version", type: "varchar", nullable: true })
  appVersion: string | null;

  @Column({ name: "permissions_ok", type: "boolean", nullable: true })
  permissionsOk: boolean | null;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: "last_sync_at", type: "timestamptz", nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: "sync_requested_at", type: "timestamptz", nullable: true })
  syncRequestedAt: Date | null;

  @Column({ name: "last_lat", type: "double precision", nullable: true })
  lastLat: number | null;

  @Column({ name: "last_lng", type: "double precision", nullable: true })
  lastLng: number | null;

  @Column({ name: "location_at", type: "timestamptz", nullable: true })
  locationAt: Date | null;

  @Column({ name: "location_accuracy", type: "double precision", nullable: true })
  locationAccuracy: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
