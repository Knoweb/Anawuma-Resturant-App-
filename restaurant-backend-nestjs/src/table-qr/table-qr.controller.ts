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
import { TableQrService } from './table-qr.service';
import { CreateTableQrDto } from './dto/create-table-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('table-qr')
export class TableQrController {
  constructor(private readonly tableQrService: TableQrService) {}

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

  // ==================== ADMIN ENDPOINTS (JWT Protected) ====================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SkipThrottle()
  async getAllQrCodes(@Request() req) {
    const restaurantId = req.user.restaurantId;
    const frontendUrl = this.resolveFrontendUrl(req);
    return this.tableQrService.findAllByRestaurant(restaurantId, frontendUrl);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SkipThrottle()
  async generateQrCode(@Request() req, @Body() createTableQrDto: CreateTableQrDto) {
    const restaurantId = req.user.restaurantId;
    const frontendUrl = this.resolveFrontendUrl(req);

    try {
      const qrCode = await this.tableQrService.generateQrCode(
        restaurantId,
        createTableQrDto.tableNo,
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
          message: error.message || 'Failed to generate QR code',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SkipThrottle()
  async deleteQrCode(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;
    await this.tableQrService.deleteOne(id, restaurantId);
    return { message: 'QR code deleted successfully' };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SkipThrottle()
  async deleteAllQrCodes(@Request() req) {
    const restaurantId = req.user.restaurantId;
    const deletedCount = await this.tableQrService.deleteAllByRestaurant(restaurantId);
    return {
      message: `${deletedCount} QR code(s) deleted successfully`,
      count: deletedCount,
    };
  }
}

// ==================== PUBLIC ENDPOINT (Customer) ====================
// Moved to separate controller for better organization
@Controller('qr')
export class QrResolveController {
  constructor(private readonly tableQrService: TableQrService) {}

  @Get('resolve/:tableKey')
  @SkipThrottle()
  async resolveTableKey(@Param('tableKey') tableKey: string) {
    try {
      const tableInfo = await this.tableQrService.resolveTableInfo(tableKey);
      return tableInfo;
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message || 'Invalid QR code',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
