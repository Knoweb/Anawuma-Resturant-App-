import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RoomQrService } from './room-qr.service';
import { CreateRoomQrDto } from './dto/create-room-qr.dto';
import { BulkRoomQrDto } from './dto/bulk-room-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagGuard } from '../common/guards/feature-flag.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresFeature } from '../common/decorators/requires-feature.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { RestaurantFeature } from '../common/enums/restaurant-feature.enum';

@Controller('room-qr')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RequiresFeature(RestaurantFeature.HOUSEKEEPING)
export class RoomQrController {
  constructor(private readonly roomQrService: RoomQrService) {}

  private resolveFrontendUrl(req: any): string {
    const extractOrigin = (input?: string): string | null => {
      if (!input) {
        return null;
      }

      try {
        const parsed = new URL(input);
        return `${parsed.protocol}//${parsed.host}`;
      } catch {
        return null;
      }
    };

    const originHeader = req?.headers?.origin;
    const refererHeader = req?.headers?.referer;

    return (
      extractOrigin(originHeader)
      || extractOrigin(refererHeader)
      || process.env.FRONTEND_URL
      || 'http://localhost:3001'
    );
  }

  // ==================== ADMIN ENDPOINTS (JWT Protected + Feature Flag) ====================

  /**
   * GET /api/room-qr
   * Get all room QR codes for the restaurant
   */
  @Get()
  @SkipThrottle()
  async getAllQrCodes(@Request() req) {
    const restaurantId = req.user.restaurantId;
    const frontendUrl = this.resolveFrontendUrl(req);
    return this.roomQrService.findAllByRestaurant(restaurantId, frontendUrl);
  }

  /**
   * POST /api/room-qr
   * Generate a single room QR code
   */
  @Post()
  @SkipThrottle()
  async generateQrCode(@Request() req, @Body() createRoomQrDto: CreateRoomQrDto) {
    const restaurantId = req.user.restaurantId;
    const frontendUrl = this.resolveFrontendUrl(req);

    try {
      const qrCode = await this.roomQrService.generateQrCode(
        restaurantId,
        createRoomQrDto.roomNo,
        frontendUrl,
      );
      return qrCode;
    } catch (error) {
      if (error.status === 409) {
        throw error; // Re-throw ConflictException
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to generate room QR code',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/room-qr/bulk
   * Generate multiple room QR codes (Room 1, Room 2, ..., Room N)
   */
  @Post('bulk')
  @SkipThrottle()
  async generateBulkQrCodes(@Request() req, @Body() bulkRoomQrDto: BulkRoomQrDto) {
    const restaurantId = req.user.restaurantId;
    const frontendUrl = this.resolveFrontendUrl(req);

    try {
      const qrCodes = await this.roomQrService.generateBulkQrCodes(
        restaurantId,
        bulkRoomQrDto.roomCount,
        frontendUrl,
      );
      return {
        message: `${qrCodes.length} room QR code(s) generated successfully`,
        count: qrCodes.length,
        rooms: qrCodes,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to generate bulk room QR codes',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/room-qr/:id
   * Delete a single room QR code
   */
  @Delete(':id')
  @SkipThrottle()
  async deleteQrCode(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;
    await this.roomQrService.deleteOne(id, restaurantId);
    return { message: 'Room QR code deleted successfully' };
  }

  /**
   * DELETE /api/room-qr
   * Delete all room QR codes for the restaurant
   */
  @Delete()
  @SkipThrottle()
  async deleteAllQrCodes(@Request() req) {
    const restaurantId = req.user.restaurantId;
    const deletedCount = await this.roomQrService.deleteAllByRestaurant(restaurantId);
    return {
      message: `${deletedCount} room QR code(s) deleted successfully`,
      count: deletedCount,
    };
  }
}

// ==================== PUBLIC ENDPOINT (Guest) ====================
@Controller('qr/room')
export class RoomQrResolveController {
  constructor(private readonly roomQrService: RoomQrService) {}

  /**
   * GET /api/qr/room/resolve/:roomKey
   * Public endpoint to resolve room info from QR code
   */
  @Get('resolve/:roomKey')
  @SkipThrottle()
  async resolveRoomKey(@Param('roomKey') roomKey: string) {
    try {
      const roomInfo = await this.roomQrService.resolveRoomInfo(roomKey);
      return {
        success: true,
        data: roomInfo,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message || 'Invalid room QR code',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
