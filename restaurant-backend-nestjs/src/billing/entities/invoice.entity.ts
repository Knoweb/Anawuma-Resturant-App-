import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum AccountantTransferStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn({ name: 'invoice_id' })
  invoiceId: number;

  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerName: string;

  @Column({
    name: 'whatsapp_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  whatsappNumber: string;

  @Column({ name: 'table_no', type: 'varchar', length: 50, nullable: true })
  tableNo: string;

  @Column({ name: 'order_items_json', type: 'json' })
  orderItemsJson: object;

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  taxAmount: number;

  @Column({
    name: 'service_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  serviceCharge: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({
    name: 'invoice_status',
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  invoiceStatus: InvoiceStatus;

  @Column({ name: 'is_printed', type: 'tinyint', default: 0 })
  isPrinted: boolean;

  @Column({ name: 'is_sent_to_cashier', type: 'tinyint', default: 0 })
  isSentToCashier: boolean;

  @Column({ name: 'is_sent_whatsapp', type: 'tinyint', default: 0 })
  isSentWhatsapp: boolean;

  @Column({ name: 'sent_to_cashier_at', type: 'datetime', nullable: true })
  sentToCashierAt: Date | null;

  @Column({
    name: 'accountant_transfer_status',
    type: 'varchar',
    length: 20,
    default: AccountantTransferStatus.NONE,
  })
  accountantTransferStatus: AccountantTransferStatus;

  @Column({ name: 'sent_to_accountant_at', type: 'datetime', nullable: true })
  sentToAccountantAt: Date | null;

  @Column({
    name: 'sent_to_accountant_by_admin_id',
    type: 'int',
    nullable: true,
  })
  sentToAccountantByAdminId: number | null;

  @Column({
    name: 'accepted_by_accountant_at',
    type: 'datetime',
    nullable: true,
  })
  acceptedByAccountantAt: Date | null;

  @Column({ name: 'accepted_by_accountant_id', type: 'int', nullable: true })
  acceptedByAccountantId: number | null;

  @Column({ name: 'created_by_admin_id', type: 'int', nullable: true })
  createdByAdminId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Derived at runtime from kitchen_orders_tbl (not persisted in invoices table)
  orderNo?: string;
}
