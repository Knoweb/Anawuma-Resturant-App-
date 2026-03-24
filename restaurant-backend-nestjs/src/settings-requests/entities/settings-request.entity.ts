import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('settings_requests')
export class SettingsRequest {
  @PrimaryGeneratedColumn()
  requestId: number;

  @Column()
  restaurantId: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column()
  requestedBy: number;

  @Column({ type: 'json' })
  requestedChanges: {
    enableHousekeeping?: boolean;
    enableKds?: boolean;
    enableReports?: boolean;
  };

  @Column({ type: 'json' })
  currentSettings: {
    enableHousekeeping: boolean;
    enableKds: boolean;
    enableReports: boolean;
  };

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  requestReason: string;

  @Column({ nullable: true })
  reviewedBy: number;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
