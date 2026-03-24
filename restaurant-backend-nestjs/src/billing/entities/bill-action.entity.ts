import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoice.entity';

export enum BillActionType {
  PDF_DOWNLOADED = 'PDF_DOWNLOADED',
  BILL_PRINTED = 'BILL_PRINTED',
  WHATSAPP_SENT = 'WHATSAPP_SENT',
}

@Entity('bill_actions')
@Index(['invoiceId', 'createdAt'])
@Index(['restaurantId', 'orderId'])
export class BillAction {
  @PrimaryGeneratedColumn('uuid', { name: 'bill_action_id' })
  billActionId: string;

  @Column({ name: 'invoice_id', type: 'int' })
  invoiceId: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: BillActionType,
  })
  actionType: BillActionType;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'device_info', type: 'varchar', length: 255, nullable: true })
  deviceInfo: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;
}
