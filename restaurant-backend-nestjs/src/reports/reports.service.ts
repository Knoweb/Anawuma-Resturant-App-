import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsHistory } from './entities/reports-history.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportsHistory)
    private reportsHistoryRepository: Repository<ReportsHistory>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
  ) {}

  async getSummary(restaurantId: number, date: string) {
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error('Invalid date format. Date parameter must be YYYY-MM-DD');
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const monthStartDate = monthStart.toISOString().split('T')[0];
    const monthEndDate = monthEnd.toISOString().split('T')[0];

    const [dailyTotals, monthlyTotals] = await Promise.all([
      this.getTotalsForDateRange(restaurantId, date, date),
      this.getTotalsForDateRange(restaurantId, monthStartDate, monthEndDate),
    ]);

    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      selectedDate: date,
      daily: {
        periodLabel: `${formattedDate} (${dayOfWeek})`,
        totalOrders: dailyTotals.totalOrders,
        totalRevenue: dailyTotals.totalRevenue,
      },
      monthly: {
        periodLabel: `${monthNames[month - 1]} ${year}`,
        totalOrders: monthlyTotals.totalOrders,
        totalRevenue: monthlyTotals.totalRevenue,
      },
    };
  }

  private async getTotalsForDateRange(
    restaurantId: number,
    fromDate: string,
    toDate: string,
  ) {
    const result = await this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: 'SERVED' })
      .andWhere('DATE(order.createdAt) BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .select('COUNT(DISTINCT order.orderId)', 'totalOrders')
      .addSelect('COALESCE(SUM(item.lineTotal), 0)', 'totalRevenue')
      .getRawOne<{ totalOrders: string; totalRevenue: string }>();

    return {
      totalOrders: parseInt(result?.totalOrders || '0', 10),
      totalRevenue: parseFloat(result?.totalRevenue || '0'),
    };
  }

  async getDailyReport(restaurantId: number, date: string) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const periodLabel = `${formattedDate} (${dayOfWeek})`;

    // Query orders and items
    const rows = await this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: 'SERVED' })
      .andWhere('DATE(order.createdAt) = :date', { date })
      .select([
        'order.orderNo as orderNo',
        'order.tableNo as tableNo',
        'order.createdAt as createdAt',
        'item.itemName as itemName',
        'item.qty as qty',
        'item.unitPrice as unitPrice',
        'item.lineTotal as lineTotal',
      ])
      .orderBy('order.createdAt', 'DESC')
      .getRawMany();

    const totalOrders = new Set(rows.map((r) => r.orderNo)).size;
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.lineTotal || 0), 0);

    // Save to history
    await this.saveToHistory(restaurantId, 'daily', date, date, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      rows: rows.map((r) => ({
        orderNo: r.orderNo,
        tableNo: r.tableNo,
        createdAt: r.createdAt,
        itemName: r.itemName,
        qty: parseInt(r.qty),
        unitPrice: parseFloat(r.unitPrice),
        lineTotal: parseFloat(r.lineTotal),
      })),
    };
  }

  async getRangeReport(restaurantId: number, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const formattedFrom = from.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTo = to.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const periodLabel = `${formattedFrom} - ${formattedTo}`;

    // Query orders and items
    const rows = await this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: 'SERVED' })
      .andWhere('DATE(order.createdAt) BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .select([
        'order.orderNo as orderNo',
        'order.tableNo as tableNo',
        'order.createdAt as createdAt',
        'item.itemName as itemName',
        'item.qty as qty',
        'item.unitPrice as unitPrice',
        'item.lineTotal as lineTotal',
      ])
      .orderBy('order.createdAt', 'DESC')
      .getRawMany();

    const totalOrders = new Set(rows.map((r) => r.orderNo)).size;
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.lineTotal || 0), 0);

    // Save to history
    await this.saveToHistory(restaurantId, 'range', fromDate, toDate, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      rows: rows.map((r) => ({
        orderNo: r.orderNo,
        tableNo: r.tableNo,
        createdAt: r.createdAt,
        itemName: r.itemName,
        qty: parseInt(r.qty),
        unitPrice: parseFloat(r.unitPrice),
        lineTotal: parseFloat(r.lineTotal),
      })),
    };
  }

  async getMonthlyReport(restaurantId: number, year: number, month: number) {
    // Calculate first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    const fromDate = firstDay.toISOString().split('T')[0];
    const toDate = lastDay.toISOString().split('T')[0];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const periodLabel = `${monthNames[month - 1]} ${year}`;

    // Query orders and items
    const rows = await this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: 'SERVED' })
      .andWhere('DATE(order.createdAt) BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .select([
        'order.orderNo as orderNo',
        'order.tableNo as tableNo',
        'order.createdAt as createdAt',
        'item.itemName as itemName',
        'item.qty as qty',
        'item.unitPrice as unitPrice',
        'item.lineTotal as lineTotal',
      ])
      .orderBy('order.createdAt', 'DESC')
      .getRawMany();

    const totalOrders = new Set(rows.map((r) => r.orderNo)).size;
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.lineTotal || 0), 0);

    // Save to history
    await this.saveToHistory(restaurantId, 'monthly', fromDate, toDate, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      rows: rows.map((r) => ({
        orderNo: r.orderNo,
        tableNo: r.tableNo,
        createdAt: r.createdAt,
        itemName: r.itemName,
        qty: parseInt(r.qty),
        unitPrice: parseFloat(r.unitPrice),
        lineTotal: parseFloat(r.lineTotal),
      })),
    };
  }

  async getHistory(restaurantId: number, limit: number = 20) {
    const history = await this.reportsHistoryRepository.find({
      where: { restaurantId },
      order: { generatedAt: 'DESC' },
      take: limit,
    });

    return history.map((h) => ({
      reportId: h.reportId,
      reportType: h.reportType,
      fromDate: h.fromDate,
      toDate: h.toDate,
      totalOrders: h.totalOrders,
      totalRevenue: parseFloat(h.totalRevenue.toString()),
      generatedAt: h.generatedAt,
    }));
  }

  async generateDailyCsv(restaurantId: number, date: string): Promise<string> {
    const report = await this.getDailyReport(restaurantId, date);

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal}\n`;
    }

    csv += `\n,,,Total Orders:,${report.totalOrders},,\n`;
    csv += `,,,Total Revenue:,,,${report.totalRevenue}\n`;

    return csv;
  }

  async generateRangeCsv(restaurantId: number, fromDate: string, toDate: string): Promise<string> {
    const report = await this.getRangeReport(restaurantId, fromDate, toDate);

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal}\n`;
    }

    csv += `\n,,,Total Orders:,${report.totalOrders},,\n`;
    csv += `,,,Total Revenue:,,,${report.totalRevenue}\n`;

    return csv;
  }

  async generateMonthlyCsv(restaurantId: number, year: number, month: number): Promise<string> {
    const report = await this.getMonthlyReport(restaurantId, year, month);

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal}\n`;
    }

    csv += `\n,,,Total Orders:,${report.totalOrders},,\n`;
    csv += `,,,Total Revenue:,,,${report.totalRevenue}\n`;

    return csv;
  }

  private async saveToHistory(
    restaurantId: number,
    reportType: string,
    fromDate: string,
    toDate: string,
    totalOrders: number,
    totalRevenue: number,
  ) {
    const history = this.reportsHistoryRepository.create({
      restaurantId,
      reportType,
      fromDate,
      toDate,
      totalOrders,
      totalRevenue,
    });

    await this.reportsHistoryRepository.save(history);
  }
}
