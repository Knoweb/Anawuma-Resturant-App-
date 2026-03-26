import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Patch,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './enums/role.enum';
import { AuthResponse } from './interfaces/auth.interface';
import { RestaurantsService } from '../restaurants/restaurants.service';
import {
  logoFileFilter,
  restaurantLogoStorage,
} from '../config/restaurant-logo-multer.config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register-restaurant')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: restaurantLogoStorage,
      fileFilter: logoFileFilter,
      limits: { fileSize: 1024 * 1024 }, // 1MB
    }),
  )
  async registerRestaurant(
    @Body() registerRestaurantDto: RegisterRestaurantDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }

    const result = await this.authService.registerRestaurant(
      registerRestaurantDto,
      `/uploads/restaurants/${file.filename}`,
    );

    return {
      success: true,
      data: result,
      message: 'Registration submitted! Your application is pending super admin approval. You will be notified once approved.',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.authService.validateUser(
      req.user.userId,
      req.user.type,
    );

    // Get restaurant settings if user has a restaurantId
    let restaurantSettings: any = null;
    if (req.user.restaurantId) {
      try {
        restaurantSettings = await this.restaurantsService.getSettings(
          req.user.restaurantId,
        );
      } catch (error) {
        // If restaurant not found, set default settings
        restaurantSettings = {
          enableHousekeeping: true,
          enableKds: true,
          enableReports: true,
        };
      }
    }
    
    return {
      success: true,
      data: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        restaurantId: req.user.restaurantId,
        restaurantName: (user as any).restaurant?.restaurantName,
        restaurantLogo: (user as any).restaurant?.logo,
        type: req.user.type,
        restaurantSettings,
        ...user,
      },
    };
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Request() req, @Body() createAdminDto: CreateAdminDto) {
    const ownerRestaurantId = req.user.role === UserRole.ADMIN ? req.user.restaurantId : undefined;
    const admin = await this.authService.createAdmin(createAdminDto, ownerRestaurantId);
    return {
      success: true,
      data: admin,
      message: 'Admin account created successfully',
    };
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getAllAdmins() {
    const admins = await this.authService.getAllAdmins();
    return {
      success: true,
      data: admins,
    };
  }

  @Delete('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async deleteAdmin(@Request() req, @Param('id') id: string) {
    const ownerRestaurantId = req.user.role === UserRole.ADMIN ? req.user.restaurantId : undefined;
    await this.authService.deleteAdmin(parseInt(id), ownerRestaurantId);
    return { success: true, message: 'Admin deleted successfully' };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.userId,
      req.user.type,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateProfile(
      req.user.userId,
      req.user.type,
      updateProfileDto.email,
      updateProfileDto.name,
    );

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }
}
