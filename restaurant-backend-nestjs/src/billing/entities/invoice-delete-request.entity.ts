import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Admin } from '../../auth/entities/admin.entity';

export enum DeleteRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('invoice_delete_requests')
@Index(['restaurantId'])
@Index(['status'])
export class InvoiceDeleteRequest {
  @PrimaryGeneratedColumn({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'invoice_id', type: 'int' })
  invoiceId: number;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @Column({ name: 'requested_by_admin_id', type: 'int' })
  requestedByAdminId: number;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: DeleteRequestStatus,
    default: DeleteRequestStatus.PENDING,
  })
  status: DeleteRequestStatus;

  @Column({ name: 'actioned_by_admin_id', type: 'int', nullable: true })
  actionedByAdminId: number | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'requested_by_admin_id' })
  requestedBy: Admin;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'actioned_by_admin_id' })
  actionedBy: Admin;
}
