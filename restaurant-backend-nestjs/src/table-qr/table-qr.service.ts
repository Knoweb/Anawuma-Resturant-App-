import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableQr } from './entities/table-qr.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import * as crypto from 'crypto';

@Injectable()
export class TableQrService {
  constructor(
    @InjectRepository(TableQr)
    private readonly tableQrRepository: Repository<TableQr>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  private normalizeFrontendUrl(frontendUrl?: string): string {
    const fallbackUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return (frontendUrl || fallbackUrl).replace(/\/$/, '');
  }

  private buildTableQrUrl(frontendUrl: string, tableKey: string): string {
    const normalizedFrontendUrl = this.normalizeFrontendUrl(frontendUrl);
    return `${normalizedFrontendUrl}/qr/${tableKey}`;
  }

  async findByTableKey(tableKey: string): Promise<TableQr | null> {
    const existingQr = await this.tableQrRepository.findOne({
      where: { tableKey, isActive: 1 },
      relations: ['restaurant'],
    });

    if (existingQr) {
      return existingQr;
    }

    // Backward compatibility: older QR links used restaurant api_key directly.
    const restaurant = await this.restaurantRepository.findOne({
      where: { apiKey: tableKey },
    });

    if (!restaurant) {
      return null;
    }

    const frontendUrl = this.normalizeFrontendUrl();

    // Use deterministic table number for legacy key mappings.
    const legacyTableNo = `LEGACY-${restaurant.restaurantId}`;

    const legacyMapping = this.tableQrRepository.create({
      restaurantId: restaurant.restaurantId,
      tableNo: legacyTableNo,
      tableKey,
      qrUrl: this.buildTableQrUrl(frontendUrl, tableKey),
      isActive: 1,
    });

    try {
      await this.tableQrRepository.save(legacyMapping);
    } catch {
      // Ignore duplicate insert race; re-query below.
    }

    return this.tableQrRepository.findOne({
      where: { tableKey, isActive: 1 },
      relations: ['restaurant'],
    });
  }

  async resolveTableInfo(tableKey: string): Promise<{
    restaurantId: number;
    restaurantName: string;
    tableNo: string;
    logo?: string;
  }> {
    const tableQr = await this.findByTableKey(tableKey);

    if (!tableQr) {
      throw new NotFoundException('Invalid or inactive QR code');
    }

    return {
      restaurantId: tableQr.restaurantId,
      restaurantName: tableQr.restaurant?.restaurantName || 'Restaurant',
      tableNo: tableQr.tableNo,
      logo: tableQr.restaurant?.logo,
    };
  }

  // Admin: Get all QR codes for a restaurant
  async findAllByRestaurant(
    restaurantId: number,
    frontendUrl?: string,
  ): Promise<TableQr[]> {
    const qrCodes = await this.tableQrRepository.find({
      where: { restaurantId, isActive: 1 },
      order: { tableNo: 'ASC' },
    });

    if (!frontendUrl) {
      return qrCodes;
    }

    const normalizedFrontendUrl = this.normalizeFrontendUrl(frontendUrl);
    const staleQrCodes = qrCodes.filter(
      (qrCode) => qrCode.qrUrl !== this.buildTableQrUrl(normalizedFrontendUrl, qrCode.tableKey),
    );

    if (staleQrCodes.length === 0) {
      return qrCodes;
    }

    staleQrCodes.forEach((qrCode) => {
      qrCode.qrUrl = this.buildTableQrUrl(normalizedFrontendUrl, qrCode.tableKey);
    });

    await this.tableQrRepository.save(staleQrCodes);
    return qrCodes;
  }

  // Admin: Generate new QR code for a table
  async generateQrCode(
    restaurantId: number,
    tableNo: string,
    frontendUrl: string = 'http://localhost:3001',
  ): Promise<TableQr> {
    // Check if table already exists for this restaurant
    const existing = await this.tableQrRepository.findOne({
      where: { restaurantId, tableNo },
    });

    if (existing) {
      throw new ConflictException(`QR code already exists for ${tableNo}`);
    }

    // Generate unique table key
    const tableKey = crypto.randomBytes(32).toString('hex'); // 64 characters

    // Create QR URL
    const qrUrl = this.buildTableQrUrl(frontendUrl, tableKey);

    const tableQr = this.tableQrRepository.create({
      restaurantId,
      tableNo,
      tableKey,
      qrUrl,
      isActive: 1,
    });

    return this.tableQrRepository.save(tableQr);
  }

  // Admin: Delete one QR code
  async deleteOne(tableQrId: number, restaurantId: number): Promise<void> {
    const result = await this.tableQrRepository.delete({
      tableQrId,
      restaurantId, // Ensure user can only delete their own restaurant's QR codes
    });

    if (result.affected === 0) {
      throw new NotFoundException('QR code not found');
    }
  }

  // Admin: Delete all QR codes for a restaurant
  async deleteAllByRestaurant(restaurantId: number): Promise<number> {
    const result = await this.tableQrRepository.delete({ restaurantId });
    return result.affected || 0;
  }

  // Legacy methods for backward compatibility
  async create(
    restaurantId: number,
    tableNo: string,
    tableKey: string,
  ): Promise<TableQr> {
    const tableQr = this.tableQrRepository.create({
      restaurantId,
      tableNo,
      tableKey,
      qrUrl: this.buildTableQrUrl(this.normalizeFrontendUrl(), tableKey),
      isActive: 1,
    });

    return this.tableQrRepository.save(tableQr);
  }

  async findByRestaurant(restaurantId: number): Promise<TableQr[]> {
    return this.tableQrRepository.find({
      where: { restaurantId },
      order: { tableNo: 'ASC' },
    });
  }

  async deactivate(tableQrId: number): Promise<void> {
    await this.tableQrRepository.update(tableQrId, { isActive: 0 });
  }

  async activate(tableQrId: number): Promise<void> {
    await this.tableQrRepository.update(tableQrId, { isActive: 1 });
  }
}
