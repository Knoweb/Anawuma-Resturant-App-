import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { HousekeepingService } from './housekeeping.service';
import { RoomQrService } from '../room-qr/room-qr.service';
import { CreateHousekeepingRequestDto } from './dto/create-housekeeping-request.dto';
import { UpdateHousekeepingStatusDto } from './dto/update-housekeeping-status.dto';
import { RequestStatus, RequestType } from './entities/housekeeping-request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresFeature } from '../common/decorators/requires-feature.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { RestaurantFeature } from '../common/enums/restaurant-feature.enum';

// ==================== PUBLIC ENDPOINT (Guest via QR Code) ====================
@Controller('housekeeping')
export class HousekeepingPublicController {
  constructor(
    private readonly housekeepingService: HousekeepingService,
    private readonly roomQrService: RoomQrService,
  ) {}

  /**
   * POST /api/housekeeping/request
   * Public endpoint for guests to submit housekeeping requests
   * Requires x-room-key header
   * Rate limited to 10 requests per 60 seconds
   */
  @Post('request')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  async createRequest(
    @Headers('x-room-key') roomKey: string,
    @Body() createDto: CreateHousekeepingRequestDto,
  ) {
    if (!roomKey) {
      throw new BadRequestException('Room key is required in x-room-key header');
    }

    try {
      // Validate room key and get room info
      const roomInfo = await this.roomQrService.resolveRoomInfo(roomKey);

      // Create request
      const request = await this.housekeepingService.createRequest(
        roomInfo.restaurantId,
        roomInfo.roomNo,
        createDto,
      );

      return {
        success: true,
        message: 'Housekeeping request submitted successfully',
        data: {
          requestId: request.requestId,
          roomNo: request.roomNo,
          requestType: request.requestType,
          status: request.status,
          createdAt: request.createdAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to submit housekeeping request',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /api/housekeeping/track/:id
   * Public endpoint for guests to track request status
   * Requires x-room-key header
   */
  @Get('track/:id')
  @SkipThrottle()
  async trackRequest(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-room-key') roomKey: string,
  ) {
    if (!roomKey) {
      throw new BadRequestException('Room key is required in x-room-key header');
    }

    try {
      const request = await this.housekeepingService.trackRequestByRoomKey(id, roomKey);

      return {
        success: true,
        data: {
          requestId: request.requestId,
          roomNo: request.roomNo,
          requestType: request.requestType,
          message: request.message,
          status: request.status,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to track request',
        },
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }
}

// ==================== ADMIN ENDPOINTS (JWT + Feature Flag Protected) ====================
@Controller('housekeeping')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RequiresFeature(RestaurantFeature.HOUSEKEEPING)
export class HousekeepingAdminController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  /**
   * GET /api/housekeeping/requests
   * Get all housekeeping requests with optional filters
   */
  @Get('requests')
  @SkipThrottle()
  async getAllRequests(
    @Request() req,
    @Query('status') status?: RequestStatus,
    @Query('roomNo') roomNo?: string,
    @Query('type') type?: RequestType,
  ) {
    const restaurantId = req.user.restaurantId;

    const requests = await this.housekeepingService.findAllByRestaurant(restaurantId, {
      status,
      roomNo,
      type,
    });

    return {
      success: true,
      count: requests.length,
      data: requests,
    };
  }

  /**
   * GET /api/housekeeping/stats
   * Get request statistics
   */
  @Get('stats')
  @SkipThrottle()
  async getStats(@Request() req) {
    const restaurantId = req.user.restaurantId;
    const stats = await this.housekeepingService.getRequestStats(restaurantId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * PATCH /api/housekeeping/requests/:id/status
   * Update request status
   */
  @Patch('requests/:id/status')
  @SkipThrottle()
  async updateStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateHousekeepingStatusDto,
  ) {
    const restaurantId = req.user.restaurantId;

    try {
      const updatedRequest = await this.housekeepingService.updateStatus(
        id,
        restaurantId,
        updateDto.status,
      );

      return {
        success: true,
        message: 'Request status updated successfully',
        data: updatedRequest,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update request status',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/housekeeping/requests/:id
   * Delete a housekeeping request
   */
  @Delete('requests/:id')
  @SkipThrottle()
  async deleteRequest(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;

    try {
      await this.housekeepingService.deleteRequest(id, restaurantId);

      return {
        success: true,
        message: 'Request deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete request',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
