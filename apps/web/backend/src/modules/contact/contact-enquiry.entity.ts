import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("contact_enquiries")
export class ContactEnquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: "varchar", nullable: true })
  company: string | null;

  @Column({ type: "varchar", nullable: true })
  plan: string | null;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
