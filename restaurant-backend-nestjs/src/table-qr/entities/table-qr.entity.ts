import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('table_qr_tbl')
export class TableQr {
  @PrimaryGeneratedColumn({ name: 'table_qr_id' })
  tableQrId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'table_no', type: 'varchar', length: 50 })
  tableNo: string;

  @Column({ name: 'table_key', type: 'varchar', length: 64, unique: true })
  tableKey: string;

  @Column({ name: 'qr_url', type: 'text', nullable: true })
  qrUrl: string;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
