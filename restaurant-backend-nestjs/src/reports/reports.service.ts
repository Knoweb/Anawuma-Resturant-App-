import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, Between } from 'typeorm';
import { ReportsHistory } from './entities/reports-history.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Invoice, PaymentMethod, InvoiceStatus } from '../billing/entities/invoice.entity';

@Injectable()
export class ReportsService {
  private getLocalStartOfDay(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00+05:30`);
  }

  private getLocalEndOfDay(dateStr: string): Date {
    return new Date(`${dateStr}T23:59:59.999+05:30`);
  }
  constructor(
    @InjectRepository(ReportsHistory)
    private reportsHistoryRepository: Repository<ReportsHistory>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
  ) {}

  async getSummary(restaurantId: number, date: string, adminId?: number) {
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
      this.getTotalsForDateRange(restaurantId, date, date, adminId),
      this.getTotalsForDateRange(restaurantId, monthStartDate, monthEndDate, adminId),
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
        foodRevenue: dailyTotals.foodRevenue,
        serviceCharge: dailyTotals.serviceCharge,
        cashRevenue: dailyTotals.cashRevenue,
        cardRevenue: dailyTotals.cardRevenue,
      },
      monthly: {
        periodLabel: `${monthNames[month - 1]} ${year}`,
        totalOrders: monthlyTotals.totalOrders,
        totalRevenue: monthlyTotals.totalRevenue,
        foodRevenue: monthlyTotals.foodRevenue,
        serviceCharge: monthlyTotals.serviceCharge,
        cashRevenue: monthlyTotals.cashRevenue,
        cardRevenue: monthlyTotals.cardRevenue,
      },
    };
  }

  private async getTotalsForDateRange(
    restaurantId: number,
    fromDate: string,
    toDate: string,
    adminId?: number,
  ) {
    const start = this.getLocalStartOfDay(fromDate);
    const end = this.getLocalEndOfDay(toDate);
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.invoiceStatus = :status', { status: 'PAID' })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', { start, end });

    if (adminId) {
      query.andWhere('invoice.createdByAdminId = :adminId', { adminId });
    }

    const result = await query
      .select('COUNT(invoice.invoiceId)', 'totalInvoices')
      .addSelect('COALESCE(SUM(invoice.totalAmount), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(invoice.subtotal), 0)', 'foodRevenue')
      .addSelect('COALESCE(SUM(invoice.serviceCharge), 0)', 'serviceCharge')
      .addSelect(
        `COALESCE(SUM(CASE WHEN invoice.payment_method = '${PaymentMethod.CASH}' THEN invoice.totalAmount ELSE 0 END), 0)`,
        'cashRevenue',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN invoice.payment_method = '${PaymentMethod.CARD}' THEN invoice.totalAmount ELSE 0 END), 0)`,
        'cardRevenue',
      )
      .getRawOne();

    return {
      totalOrders: parseInt(result?.totalInvoices || '0', 10),
      totalRevenue: parseFloat(result?.totalRevenue || '0'),
      foodRevenue: parseFloat(result?.foodRevenue || '0'),
      serviceCharge: parseFloat(result?.serviceCharge || '0'),
      cashRevenue: parseFloat(result?.cashRevenue || '0'),
      cardRevenue: parseFloat(result?.cardRevenue || '0'),
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

    const start = this.getLocalStartOfDay(date);
    const end = this.getLocalEndOfDay(date);
    const invoices = await this.invoicesRepository.find({
      where: {
        restaurantId,
        invoiceStatus: InvoiceStatus.PAID,
        createdAt: Between(start, end),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
    
    const rows: any[] = [];
    let totalRevenue = 0;
    let foodRevenue = 0;
    let serviceCharge = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;

    invoices.forEach((inv) => {
      const amount = parseFloat(inv.totalAmount.toString());
      const sub = parseFloat(inv.subtotal.toString());
      const sc = parseFloat(inv.serviceCharge.toString());

      totalRevenue += amount;
      foodRevenue += sub;
      serviceCharge += sc;

      if (inv.paymentMethod === PaymentMethod.CASH) cashRevenue += amount;
      if (inv.paymentMethod === PaymentMethod.CARD) cardRevenue += amount;

      const items = Array.isArray(inv.orderItemsJson) ? inv.orderItemsJson : [];
      items.forEach((item: any) => {
        rows.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          orderNo: item.orderNo || inv.invoiceNumber,
          tableNo: inv.tableNo,
          createdAt: inv.createdAt,
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          serviceCharge: sub > 0 ? parseFloat(((item.lineTotal / sub) * sc).toFixed(2)) : 0,
          paymentMethod: inv.paymentMethod,
          cashier: inv.createdBy?.email || 'N/A',
          invoiceServiceCharge: sc,
          invoiceSubtotal: sub,
        });
      });
    });

    const totalOrders = invoices.length;

    // Save to history (optional status tracking)
    await this.saveToHistory(restaurantId, 'daily', date, date, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      foodRevenue: parseFloat(foodRevenue.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      cashRevenue: parseFloat(cashRevenue.toFixed(2)),
      cardRevenue: parseFloat(cardRevenue.toFixed(2)),
      rows,
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

    const start = this.getLocalStartOfDay(fromDate);
    const end = this.getLocalEndOfDay(toDate);
    const invoices = await this.invoicesRepository.find({
      where: {
        restaurantId,
        invoiceStatus: InvoiceStatus.PAID,
        createdAt: Between(start, end),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    const rows: any[] = [];
    let totalRevenue = 0;
    let foodRevenue = 0;
    let serviceCharge = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;

    invoices.forEach((inv) => {
      const amount = parseFloat(inv.totalAmount.toString());
      const sub = parseFloat(inv.subtotal.toString());
      const sc = parseFloat(inv.serviceCharge.toString());

      totalRevenue += amount;
      foodRevenue += sub;
      serviceCharge += sc;
      
      if (inv.paymentMethod === PaymentMethod.CASH) cashRevenue += amount;
      if (inv.paymentMethod === PaymentMethod.CARD) cardRevenue += amount;

      const items = Array.isArray(inv.orderItemsJson) ? inv.orderItemsJson : [];
      items.forEach((item: any) => {
        rows.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          orderNo: item.orderNo || inv.invoiceNumber,
          tableNo: inv.tableNo,
          createdAt: inv.createdAt,
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          serviceCharge: sub > 0 ? parseFloat(((item.lineTotal / sub) * sc).toFixed(2)) : 0,
          paymentMethod: inv.paymentMethod,
          cashier: inv.createdBy?.email || 'N/A',
          invoiceServiceCharge: sc,
          invoiceSubtotal: sub,
        });
      });
    });

    const totalOrders = invoices.length;

    // Save to history
    await this.saveToHistory(restaurantId, 'range', fromDate, toDate, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      foodRevenue: parseFloat(foodRevenue.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      cashRevenue: parseFloat(cashRevenue.toFixed(2)),
      cardRevenue: parseFloat(cardRevenue.toFixed(2)),
      rows,
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

    const start = this.getLocalStartOfDay(fromDate);
    const end = this.getLocalEndOfDay(toDate);
    const invoices = await this.invoicesRepository.find({
      where: {
        restaurantId,
        invoiceStatus: InvoiceStatus.PAID,
        createdAt: Between(start, end),
      },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    const rows: any[] = [];
    let totalRevenue = 0;
    let foodRevenue = 0;
    let serviceCharge = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;

    invoices.forEach((inv) => {
      const amount = parseFloat(inv.totalAmount.toString());
      const sub = parseFloat(inv.subtotal.toString());
      const sc = parseFloat(inv.serviceCharge.toString());

      totalRevenue += amount;
      foodRevenue += sub;
      serviceCharge += sc;
      
      if (inv.paymentMethod === PaymentMethod.CASH) cashRevenue += amount;
      if (inv.paymentMethod === PaymentMethod.CARD) cardRevenue += amount;

      const items = Array.isArray(inv.orderItemsJson) ? inv.orderItemsJson : [];
      items.forEach((item: any) => {
        rows.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          orderNo: item.orderNo || inv.invoiceNumber,
          tableNo: inv.tableNo,
          createdAt: inv.createdAt,
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          serviceCharge: sub > 0 ? parseFloat(((item.lineTotal / sub) * sc).toFixed(2)) : 0,
          paymentMethod: inv.paymentMethod,
          cashier: inv.createdBy?.email || 'N/A',
          invoiceServiceCharge: sc,
          invoiceSubtotal: sub,
        });
      });
    });

    const totalOrders = invoices.length;

    // Save to history
    await this.saveToHistory(restaurantId, 'monthly', fromDate, toDate, totalOrders, totalRevenue);

    return {
      periodLabel,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      foodRevenue: parseFloat(foodRevenue.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      cashRevenue: parseFloat(cashRevenue.toFixed(2)),
      cardRevenue: parseFloat(cardRevenue.toFixed(2)),
      rows,
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

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total,Service Charge,Payment,Cashier\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal},${row.serviceCharge},${row.paymentMethod},"${row.cashier}"\n`;
    }

    csv += `\n,,,,Total Orders:,${report.totalOrders},,,\n`;
    csv += `,,,,Food Total:,,,${report.foodRevenue || 0},\n`;
    csv += `,,,,Service Charge:,,,${report.serviceCharge || 0},\n`;
    csv += `,,,,Total Revenue:,,,${report.totalRevenue},\n`;
    csv += `,,,,Cash Revenue:,,,${report.cashRevenue || 0},\n`;
    csv += `,,,,Card Revenue:,,,${report.cardRevenue || 0},\n`;

    return csv;
  }

  async generateRangeCsv(restaurantId: number, fromDate: string, toDate: string): Promise<string> {
    const report = await this.getRangeReport(restaurantId, fromDate, toDate);

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total,Service Charge,Payment,Cashier\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal},${row.serviceCharge},${row.paymentMethod},"${row.cashier}"\n`;
    }

    csv += `\n,,,,Total Orders:,${report.totalOrders},,,\n`;
    csv += `,,,,Food Total:,,,${report.foodRevenue || 0},\n`;
    csv += `,,,,Service Charge:,,,${report.serviceCharge || 0},\n`;
    csv += `,,,,Total Revenue:,,,${report.totalRevenue},\n`;
    csv += `,,,,Cash Revenue:,,,${report.cashRevenue || 0},\n`;
    csv += `,,,,Card Revenue:,,,${report.cardRevenue || 0},\n`;

    return csv;
  }

  async generateMonthlyCsv(restaurantId: number, year: number, month: number): Promise<string> {
    const report = await this.getMonthlyReport(restaurantId, year, month);

    let csv = 'Order No,Table No,Date/Time,Item Name,Qty,Unit Price,Line Total,Service Charge,Payment,Cashier\n';
    
    for (const row of report.rows) {
      const dateTime = new Date(row.createdAt).toLocaleString();
      csv += `${row.orderNo},"${row.tableNo}","${dateTime}","${row.itemName}",${row.qty},${row.unitPrice},${row.lineTotal},${row.serviceCharge},${row.paymentMethod},"${row.cashier}"\n`;
    }

    csv += `\n,,,,Total Orders:,${report.totalOrders},,,\n`;
    csv += `,,,,Food Total:,,,${report.foodRevenue || 0},\n`;
    csv += `,,,,Service Charge:,,,${report.serviceCharge || 0},\n`;
    csv += `,,,,Total Revenue:,,,${report.totalRevenue},\n`;
    csv += `,,,,Cash Revenue:,,,${report.cashRevenue || 0},\n`;
    csv += `,,,,Card Revenue:,,,${report.cardRevenue || 0},\n`;

    return csv;
  }

  // ─── Cashier-specific methods ─────────────────────────────────────────────

  async getCashierSummary(restaurantId: number, cashierId: number, date: string) {
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) throw new Error('Invalid date format');

    // Daily
    const dailyFrom = date;
    const dailyTo = date;

    // Weekly: Mon → date
    const dayOfWeek = dateObj.getDay(); // 0=Sun
    const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() + diffToMon);
    const weeklyFrom = weekStart.toISOString().split('T')[0];
    const weeklyTo = date;

    // Monthly
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthlyFrom = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const monthlyTo = new Date(year, month, 0).toISOString().split('T')[0];

    const [daily, weekly, monthly] = await Promise.all([
      this.getTotalsForDateRange(restaurantId, dailyFrom, dailyTo, cashierId),
      this.getTotalsForDateRange(restaurantId, weeklyFrom, weeklyTo, cashierId),
      this.getTotalsForDateRange(restaurantId, monthlyFrom, monthlyTo, cashierId),
    ]);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      selectedDate: date,
      daily: { ...daily, periodLabel: date },
      weekly: { ...weekly, periodLabel: `${weeklyFrom} → ${weeklyTo}` },
      monthly: { ...monthly, periodLabel: `${monthNames[month - 1]} ${year}` },
    };
  }

  async getCashierTransactions(
    restaurantId: number,
    cashierId: number,
    fromDate: string,
    toDate: string,
  ) {
    const start = this.getLocalStartOfDay(fromDate);
    const end = this.getLocalEndOfDay(toDate);
    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.invoiceStatus = :status', { status: 'PAID' })
      .andWhere('invoice.createdByAdminId = :cashierId', { cashierId })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', { start, end })
      .orderBy('invoice.createdAt', 'DESC')
      .getMany();

    const rows: any[] = [];
    let totalRevenue = 0;
    let foodRevenue = 0;
    let serviceCharge = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;

    invoices.forEach((inv) => {
      const amount = parseFloat(inv.totalAmount.toString());
      const sub = parseFloat(inv.subtotal.toString());
      const sc = parseFloat(inv.serviceCharge.toString());

      totalRevenue += amount;
      foodRevenue += sub;
      serviceCharge += sc;
      if (inv.paymentMethod === 'CASH') cashRevenue += amount;
      if (inv.paymentMethod === 'CARD') cardRevenue += amount;

      const items = Array.isArray(inv.orderItemsJson) ? inv.orderItemsJson : [];
      items.forEach((item: any) => {
        rows.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          orderNo: item.orderNo || inv.invoiceNumber,
          tableNo: inv.tableNo,
          createdAt: inv.createdAt,
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          paymentMethod: inv.paymentMethod,
          invoiceServiceCharge: sc,
          invoiceSubtotal: sub,
        });
      });
    });

    return {
      periodLabel: fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`,
      totalInvoices: invoices.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      foodRevenue: parseFloat(foodRevenue.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      cashRevenue: parseFloat(cashRevenue.toFixed(2)),
      cardRevenue: parseFloat(cardRevenue.toFixed(2)),
      rows,
    };
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
