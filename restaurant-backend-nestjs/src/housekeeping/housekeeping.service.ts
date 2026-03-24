import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HousekeepingRequest, RequestStatus, RequestType } from './entities/housekeeping-request.entity';
import { CreateHousekeepingRequestDto } from './dto/create-housekeeping-request.dto';
import { RoomQr } from '../room-qr/entities/room-qr.entity';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class HousekeepingService {
  constructor(
    @InjectRepository(HousekeepingRequest)
    private readonly housekeepingRepository: Repository<HousekeepingRequest>,
    @InjectRepository(RoomQr)
    private readonly roomQrRepository: Repository<RoomQr>,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Public: Create a housekeeping request from guest (via room QR)
   */
  async createRequest(
    restaurantId: number,
    roomNo: string,
    createDto: CreateHousekeepingRequestDto,
  ): Promise<HousekeepingRequest> {
    const request = new HousekeepingRequest();
    request.restaurantId = restaurantId;
    request.roomNo = roomNo;
    request.requestType = createDto.requestType;
    request.message = createDto.message || null;
    request.status = RequestStatus.NEW;

    const savedRequest = await this.housekeepingRepository.save(request);

    // Emit live update
    this.websocketGateway.server.emit('housekeeping:new', savedRequest);
    this.websocketGateway.server.emit('dashboard:refresh', { restaurantId });

    return savedRequest;
  }

  /**
   * Admin: Get all requests for restaurant with optional filters
   */
  async findAllByRestaurant(
    restaurantId: number,
    filters?: {
      status?: RequestStatus;
      roomNo?: string;
      type?: RequestType;
    },
  ): Promise<HousekeepingRequest[]> {
    const query = this.housekeepingRepository
      .createQueryBuilder('request')
      .where('request.restaurantId = :restaurantId', { restaurantId });

    if (filters?.status) {
      query.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters?.roomNo) {
      query.andWhere('request.roomNo LIKE :roomNo', { roomNo: `%${filters.roomNo}%` });
    }

    if (filters?.type) {
      query.andWhere('request.requestType = :type', { type: filters.type });
    }

    query.orderBy('request.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Admin: Update request status
   */
  async updateStatus(
    requestId: number,
    restaurantId: number,
    status: RequestStatus,
  ): Promise<HousekeepingRequest> {
    const request = await this.housekeepingRepository.findOne({
      where: { requestId, restaurantId },
    });

    if (!request) {
      throw new NotFoundException('Housekeeping request not found');
    }

    request.status = status;
    const updatedRequest = await this.housekeepingRepository.save(request);

    // Emit live update
    this.websocketGateway.server.emit('housekeeping:status-update', updatedRequest);
    this.websocketGateway.server.emit('dashboard:refresh', { restaurantId });

    return updatedRequest;
  }

  /**
   * Admin: Delete a request
   */
  async deleteRequest(requestId: number, restaurantId: number): Promise<void> {
    const result = await this.housekeepingRepository.delete({
      requestId,
      restaurantId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Housekeeping request not found');
    }

    // Emit live update (optional but good for dashboard consistency)
    this.websocketGateway.server.emit('dashboard:refresh', { restaurantId });
  }

  /**
   * Admin: Get request count by status
   */
  async getRequestStats(restaurantId: number): Promise<{
    total: number;
    new: number;
    inProgress: number;
    done: number;
    cancelled: number;
  }> {
    const requests = await this.housekeepingRepository.find({
      where: { restaurantId },
    });

    return {
      total: requests.length,
      new: requests.filter((r) => r.status === RequestStatus.NEW).length,
      inProgress: requests.filter((r) => r.status === RequestStatus.IN_PROGRESS).length,
      done: requests.filter((r) => r.status === RequestStatus.DONE).length,
      cancelled: requests.filter((r) => r.status === RequestStatus.CANCELLED).length,
    };
  }

  /**
   * Public: Track request status by room key (for guests)
   */
  async trackRequestByRoomKey(
    requestId: number,
    roomKey: string,
  ): Promise<HousekeepingRequest> {
    // Verify room key
    const roomQr = await this.roomQrRepository.findOne({
      where: { roomKey, isActive: 1 },
    });

    if (!roomQr) {
      throw new UnauthorizedException('Invalid room key');
    }

    // Find request that matches room key's restaurant and room number
    const request = await this.housekeepingRepository.findOne({
      where: {
        requestId,
        restaurantId: roomQr.restaurantId,
        roomNo: roomQr.roomNo,
      },
    });

    if (!request) {
      throw new NotFoundException('Housekeeping request not found');
    }

    return request;
  }
}
