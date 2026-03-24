import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);
  
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req) {
    const user = req.user;
    
    this.logger.log(`Dashboard stats requested by user: ${JSON.stringify(user)}`);
    
    // Super admin can see all stats, admin only sees their restaurant
    const restaurantId = user.type === 'super_admin' ? undefined : user.restaurantId;
    
    this.logger.log(`Fetching stats for restaurantId: ${restaurantId}`);
    
    const stats = await this.dashboardService.getStats(restaurantId);
    
    this.logger.log(`Stats result: ${JSON.stringify(stats)}`);
    
    return stats;
  }
}
