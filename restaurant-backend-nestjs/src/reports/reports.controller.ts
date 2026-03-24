import { Controller, Get, Query, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(@Request() req, @Query('date') date: string) {
    if (!date) {
      throw new Error('Date parameter is required (YYYY-MM-DD)');
    }
    const restaurantId = req.user.restaurantId;
    return this.reportsService.getSummary(restaurantId, date);
  }

  @Get('daily')
  async getDailyReport(@Request() req, @Query('date') date: string) {
    if (!date) {
      throw new Error('Date parameter is required (YYYY-MM-DD)');
    }
    const restaurantId = req.user.restaurantId;
    return this.reportsService.getDailyReport(restaurantId, date);
  }

  @Get('range')
  async getRangeReport(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    if (!fromDate || !toDate) {
      throw new Error('Both from and to date parameters are required (YYYY-MM-DD)');
    }
    const restaurantId = req.user.restaurantId;
    return this.reportsService.getRangeReport(restaurantId, fromDate, toDate);
  }

  @Get('monthly')
  async getMonthlyReport(
    @Request() req,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    if (!year || !month) {
      throw new Error('Both year and month parameters are required');
    }
    const restaurantId = req.user.restaurantId;
    return this.reportsService.getMonthlyReport(restaurantId, parseInt(year), parseInt(month));
  }

  @Get('history')
  async getHistory(@Request() req, @Query('limit') limit?: string) {
    const restaurantId = req.user.restaurantId;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.reportsService.getHistory(restaurantId, limitNum);
  }

  @Get('daily/csv')
  async getDailyCsv(
    @Request() req,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    if (!date) {
      throw new Error('Date parameter is required (YYYY-MM-DD)');
    }
    const restaurantId = req.user.restaurantId;
    const csv = await this.reportsService.generateDailyCsv(restaurantId, date);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales-report-${date}.csv"`,
    );
    res.send(csv);
  }

  @Get('range/csv')
  async getRangeCsv(
    @Request() req,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Res() res: Response,
  ) {
    if (!fromDate || !toDate) {
      throw new Error('Both from and to date parameters are required (YYYY-MM-DD)');
    }
    const restaurantId = req.user.restaurantId;
    const csv = await this.reportsService.generateRangeCsv(
      restaurantId,
      fromDate,
      toDate,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales-report-${fromDate}-to-${toDate}.csv"`,
    );
    res.send(csv);
  }

  @Get('monthly/csv')
  async getMonthlyCsv(
    @Request() req,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    if (!year || !month) {
      throw new Error('Both year and month parameters are required');
    }
    const restaurantId = req.user.restaurantId;
    const csv = await this.reportsService.generateMonthlyCsv(
      restaurantId,
      parseInt(year),
      parseInt(month),
    );

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="monthly-report-${monthName}-${year}.csv"`,
    );
    res.send(csv);
  }
}
