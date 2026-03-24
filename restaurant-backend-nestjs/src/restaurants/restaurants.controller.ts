import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurantsService } from './restaurants.service';
import { SettingsRequestsService } from '../settings-requests/settings-requests.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';
import { RestaurantSettingsResponseDto } from './dto/restaurant-settings-response.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  logoFileFilter,
  restaurantLogoStorage,
  maxLogoFileSize,
} from '../config/restaurant-logo-multer.config';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly settingsRequestsService: SettingsRequestsService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Get('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getSettings(
    @Request() req,
  ): Promise<{ success: boolean; data: RestaurantSettingsResponseDto }> {
    const restaurantId = req.user.restaurantId;
    const settings = await this.restaurantsService.getSettings(restaurantId);
    return {
      success: true,
      data: settings,
    };
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Request() req,
    @Body() updateDto: UpdateRestaurantSettingsDto,
  ): Promise<{ success: boolean; data?: any; message: string }> {
    const restaurantId = req.user.restaurantId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // If admin, create a settings request (requires approval)
    if (userRole === UserRole.ADMIN) {
      return await this.settingsRequestsService.create(
        updateDto,
        restaurantId,
        userId,
      );
    }
    
    // If super_admin, update directly
    const settings = await this.restaurantsService.updateSettings(
      restaurantId,
      updateDto,
    );

    // Notify admins of this restaurant so their auth store (and sidebar/route
    // guards) reflect the new feature flags without requiring a page refresh
    this.websocketGateway.server.emit('settings:updated', {
      restaurantId,
      settings,
    });

    return {
      success: true,
      data: settings,
      message: 'Restaurant settings updated successfully',
    };
  }

  @Post('upgrade')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @Body() body: { restaurantId: number; packageId: number; promoCode?: string },
  ) {
    const restaurant = await this.restaurantsService.upgrade(
      +body.restaurantId,
      +body.packageId,
    );
    return {
      success: true,
      data: restaurant,
      message: 'Package upgraded successfully',
    };
  }

  // Super Admin Endpoints

  @Post('upload-logo')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: restaurantLogoStorage,
      fileFilter: logoFileFilter,
      limits: { fileSize: maxLogoFileSize },
    }),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const logoUrl = `/uploads/restaurants/${file.filename}`;

    return {
      success: true,
      message: 'Restaurant logo uploaded successfully',
      logoUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  // ── Pending Registration Endpoints (must be before :id routes) ──

  @Get('registrations/pending')
  @Roles(UserRole.SUPER_ADMIN)
  async getPendingRegistrations() {
    const restaurants = await this.restaurantsService.getPendingRegistrations();
    return { success: true, data: restaurants };
  }

  @Get('registrations/pending/count')
  @Roles(UserRole.SUPER_ADMIN)
  async getPendingRegistrationsCount() {
    const count = await this.restaurantsService.getPendingRegistrationsCount();
    return { success: true, data: { count } };
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveRegistration(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.approveRegistration(+id);
    return {
      success: true,
      data: restaurant,
      message: `${restaurant.restaurantName} has been approved and their 30-day trial is now active.`,
    };
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectRegistration(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.rejectRegistration(+id);
    return {
      success: true,
      data: restaurant,
      message: `${restaurant.restaurantName} registration has been rejected.`,
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    const restaurants = await this.restaurantsService.findAll();
    return {
      success: true,
      data: restaurants,
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.findById(+id);
    return {
      success: true,
      data: restaurant,
    };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRestaurantDto: CreateRestaurantDto) {
    const restaurant = await this.restaurantsService.create(createRestaurantDto);
    return {
      success: true,
      data: restaurant,
      message: 'Restaurant created successfully',
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    const restaurant = await this.restaurantsService.update(
      +id,
      updateRestaurantDto,
    );

    this.websocketGateway.server.emit('restaurant:updated', {
      restaurantId: +id,
      restaurant,
    });

    return {
      success: true,
      data: restaurant,
      message: 'Restaurant updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.restaurantsService.remove(+id);
    return {
      success: true,
      message: 'Restaurant deleted successfully',
    };
  }
}
