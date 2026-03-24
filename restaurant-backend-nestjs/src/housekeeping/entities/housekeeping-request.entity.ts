import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum RequestType {
  CLEANING = 'CLEANING',
  TOWELS = 'TOWELS',
  WATER = 'WATER',
  OTHER = 'OTHER',
}

export enum RequestStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

@Entity('housekeeping_requests_tbl')
export class HousekeepingRequest {
  @PrimaryGeneratedColumn({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'room_no', type: 'varchar', length: 50 })
  roomNo: string;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: RequestType,
    default: RequestType.CLEANING,
  })
  requestType: RequestType;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.NEW,
  })
  status: RequestStatus;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
