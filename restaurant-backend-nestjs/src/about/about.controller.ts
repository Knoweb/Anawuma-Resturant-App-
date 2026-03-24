import { Controller, Get, Body, Put, UseGuards } from '@nestjs/common';
import { AboutService } from './about.service';
import { UpdateAboutDto } from './dto/update-about.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../auth/enums/role.enum';

@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Get()
  async getAboutContent() {
    return this.aboutService.getAboutContent();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Put()
  async updateAboutContent(@Body() updateAboutDto: UpdateAboutDto) {
    return this.aboutService.updateAboutContent(updateAboutDto);
  }
}
