import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('room_qr_tbl')
export class RoomQr {
  @PrimaryGeneratedColumn({ name: 'room_qr_id' })
  roomQrId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'room_no', type: 'varchar', length: 50 })
  roomNo: string;

  @Column({ name: 'room_key', type: 'varchar', length: 64, unique: true })
  roomKey: string;

  @Column({ name: 'qr_url', type: 'text', nullable: true })
  qrUrl: string;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
