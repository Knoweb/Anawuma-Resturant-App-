import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsRequest, RequestStatus } from './entities/settings-request.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateSettingsRequestDto } from './dto/create-settings-request.dto';
import { ReviewSettingsRequestDto, ReviewAction } from './dto/review-settings-request.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class SettingsRequestsService {
  constructor(
    @InjectRepository(SettingsRequest)
    private settingsRequestRepository: Repository<SettingsRequest>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async create(
    createSettingsRequestDto: CreateSettingsRequestDto,
    restaurantId: number,
    userId: number,
  ) {
    // Get current restaurant settings
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check if there's already a pending request
    const existingRequest = await this.settingsRequestRepository.findOne({
      where: {
        restaurantId,
        status: RequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending settings change request. Please wait for approval.',
      );
    }

    const currentSettings = {
      enableHousekeeping: restaurant.enableHousekeeping,
      enableKds: restaurant.enableKds,
      enableReports: restaurant.enableReports,
      enableAccountant: restaurant.enableAccountant,
      enableCashier: restaurant.enableCashier,
    };

    // Extract only the fields that actually changed
    const changedSettings: any = {};
    const settingsKeys = ['enableHousekeeping', 'enableKds', 'enableReports', 'enableAccountant', 'enableCashier'];
    
    settingsKeys.forEach(key => {
      if (
        createSettingsRequestDto[key] !== undefined &&
        Boolean(createSettingsRequestDto[key]) !== Boolean(currentSettings[key])
      ) {
        changedSettings[key] = createSettingsRequestDto[key];
      }
    });

    // If no actual changes, reject the request
    if (Object.keys(changedSettings).length === 0) {
      throw new BadRequestException(
        'No actual changes detected in the settings.',
      );
    }

    // Create the request
    const request = this.settingsRequestRepository.create({
      restaurantId,
      requestedBy: userId,
      requestedChanges: changedSettings, // Only store actual changes
      currentSettings,
      requestReason: createSettingsRequestDto.requestReason,
      status: RequestStatus.PENDING,
    });

    const savedRequest = await this.settingsRequestRepository.save(request);

    // Notify Super Admin via WebSocket
    this.websocketGateway.emitToRole('super_admin', 'settings-request:new', {
      requestId: savedRequest.requestId,
      restaurantId,
      restaurantName: restaurant.restaurantName,
      requestedBy: userId,
      requestedChanges: changedSettings, // Send only actual changes
      createdAt: savedRequest.createdAt,
    });

    console.log('🔔 Settings change request created:', savedRequest.requestId);

    return {
      success: true,
      message: 'Settings change request submitted successfully. Waiting for Super Admin approval.',
      data: savedRequest,
    };
  }

  async findAll(restaurantId?: number) {
    const query = this.settingsRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.restaurant', 'restaurant')
      .orderBy('request.createdAt', 'DESC');

    if (restaurantId) {
      query.where('request.restaurantId = :restaurantId', { restaurantId });
    }

    const requests = await query.getMany();

    return {
      success: true,
      data: requests,
    };
  }

  async findOne(id: number, restaurantId?: number) {
    const query = this.settingsRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.restaurant', 'restaurant')
      .where('request.requestId = :id', { id });

    if (restaurantId) {
      query.andWhere('request.restaurantId = :restaurantId', { restaurantId });
    }

    const request = await query.getOne();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return {
      success: true,
      data: request,
    };
  }

  async review(
    id: number,
    reviewDto: ReviewSettingsRequestDto,
    reviewerId: number,
  ) {
    const request = await this.settingsRequestRepository.findOne({
      where: { requestId: id },
      relations: ['restaurant'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    // Update request status
    request.status =
      reviewDto.action === ReviewAction.APPROVE
        ? RequestStatus.APPROVED
        : RequestStatus.REJECTED;
    request.reviewedBy = reviewerId;
    request.reviewNotes = reviewDto.reviewNotes || '';
    request.reviewedAt = new Date();

    await this.settingsRequestRepository.save(request);

    // If approved, update restaurant settings
    if (reviewDto.action === ReviewAction.APPROVE) {
      await this.restaurantRepository.update(
        { restaurantId: request.restaurantId },
        request.requestedChanges,
      );

      console.log(
        '✅ Restaurant settings updated after approval:',
        request.restaurantId,
      );
    }

    // Notify restaurant admin — include approvedSettings when approved so the
    // frontend can immediately update the auth store without an extra API call
    this.websocketGateway.server.emit('settings-request:reviewed', {
      requestId: request.requestId,
      restaurantId: request.restaurantId,
      status: request.status,
      reviewNotes: request.reviewNotes,
      reviewedAt: request.reviewedAt,
      approvedSettings:
        reviewDto.action === ReviewAction.APPROVE
          ? request.requestedChanges
          : null,
    });

    return {
      success: true,
      message: `Request ${reviewDto.action === ReviewAction.APPROVE ? 'approved' : 'rejected'} successfully`,
      data: request,
    };
  }

  async getPendingCount() {
    const count = await this.settingsRequestRepository.count({
      where: { status: RequestStatus.PENDING },
    });

    return {
      success: true,
      data: { count },
    };
  }
}
