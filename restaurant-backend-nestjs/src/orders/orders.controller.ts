import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  Header,
  Headers,
  BadRequestException,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { KitchenDashboardQueryDto } from './dto/kitchen-dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { TableKeyGuard } from '../common/guards/table-key.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(TableKeyGuard) // Secure public endpoint with table key
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    // restaurantId and tableNo come from TableKeyGuard (attached to req)
    const restaurantId = req.restaurantId;
    const tableNo = req.tableNo;
    
    // Validate items array is not empty
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Override tableNo from the QR code (more secure than client input)
    const orderData = { ...createOrderDto, tableNo };

    return this.ordersService.create(orderData, restaurantId);
  }

  @Get()
  @SkipThrottle() // Skip rate limiting for authenticated GET requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  findAll(@Query() queryDto: QueryOrdersDto, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.findAll(restaurantId, queryDto);
  }

  @Get(':id')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.findOne(id, restaurantId);
  }

  @Get('kitchen/dashboard-summary')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  getKitchenDashboardSummary(
    @Query() queryDto: KitchenDashboardQueryDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.getKitchenDashboardSummary(restaurantId, queryDto);
  }

  // Public endpoint for customers to track their order
  @Get('track/:id')
  @SkipThrottle()
  async trackOrder(@Param('id', ParseIntPipe) id: number, @Headers('x-table-key') tableKey: string) {
    if (!tableKey) {
      throw new HttpException('Table key is required', HttpStatus.UNAUTHORIZED);
    }
    
    // Verify table key and get order
    const order = await this.ordersService.trackOrderByTableKey(id, tableKey);
    if (!order) {
      throw new HttpException('Order not found or unauthorized', HttpStatus.NOT_FOUND);
    }
    
    return order;
  }

  @Patch(':id/status')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.updateStatus(id, updateOrderStatusDto, restaurantId);
  }

  @Delete(':id')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.remove(id, restaurantId);
  }
}
