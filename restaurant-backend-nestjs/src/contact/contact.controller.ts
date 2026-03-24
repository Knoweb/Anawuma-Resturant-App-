import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async create(@Body() createContactRequestDto: CreateContactRequestDto) {
    const result = await this.contactService.create(createContactRequestDto);
    return {
      success: true,
      message: 'Contact request submitted successfully',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    return await this.contactService.findAll();
  }
}
