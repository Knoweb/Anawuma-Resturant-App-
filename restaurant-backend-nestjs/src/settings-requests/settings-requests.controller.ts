import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { SettingsRequestsService } from './settings-requests.service';
import { CreateSettingsRequestDto } from './dto/create-settings-request.dto';
import { ReviewSettingsRequestDto } from './dto/review-settings-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('settings-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsRequestsController {
  constructor(
    private readonly settingsRequestsService: SettingsRequestsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateSettingsRequestDto, @Request() req) {
    return this.settingsRequestsService.create(
      createDto,
      req.user.restaurantId,
      req.user.id,
    );
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(@Request() req) {
    // If admin, filter by their restaurant. If super_admin, show all
    const restaurantId =
      req.user.role === 'admin' ? req.user.restaurantId : undefined;
    return this.settingsRequestsService.findAll(restaurantId);
  }

  @Get('pending/count')
  @Roles(UserRole.SUPER_ADMIN)
  getPendingCount() {
    return this.settingsRequestsService.getPendingCount();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId =
      req.user.role === 'admin' ? req.user.restaurantId : undefined;
    return this.settingsRequestsService.findOne(id, restaurantId);
  }

  @Patch(':id/review')
  @Roles(UserRole.SUPER_ADMIN)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewSettingsRequestDto,
    @Request() req,
  ) {
    return this.settingsRequestsService.review(id, reviewDto, req.user.id);
  }
}
