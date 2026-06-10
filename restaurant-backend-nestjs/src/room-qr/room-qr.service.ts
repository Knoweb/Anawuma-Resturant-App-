import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomQr } from './entities/room-qr.entity';
import * as crypto from 'crypto';

@Injectable()
export class RoomQrService {
  constructor(
    @InjectRepository(RoomQr)
    private readonly roomQrRepository: Repository<RoomQr>,
  ) {}

  // Session store to track active resolved Room QR keys (sliding window)
  private readonly sessionStore = new Map<string, number>();

  private normalizeFrontendUrl(frontendUrl?: string): string {
    const fallbackUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return (frontendUrl || fallbackUrl).replace(/\/$/, '');
  }

  private buildRoomQrUrl(frontendUrl: string, roomKey: string): string {
    const normalizedFrontendUrl = this.normalizeFrontendUrl(frontendUrl);
    return `${normalizedFrontendUrl}/room/${roomKey}`;
  }

  /**
   * Find room QR by room key
   */
  async findByRoomKey(roomKey: string, isResolve: boolean = false): Promise<RoomQr | null> {
    const roomQr = await this.roomQrRepository.findOne({
      where: { roomKey, isActive: 1 },
      relations: ['restaurant'],
    });

    if (!roomQr) {
      return null;
    }

    // Validate sliding session window
    const now = Date.now();
    const expiryMs = 2 * 60 * 60 * 1000; // 2 hours
    const lastActive = this.sessionStore.get(roomKey);

    if (isResolve) {
      // Resolve endpoint starts or refreshes the session
      this.sessionStore.set(roomKey, now);
    } else {
      // Other requests (placing orders/requests) require a valid non-expired session
      if (!lastActive || (now - lastActive) > expiryMs) {
        this.sessionStore.delete(roomKey);
        return null;
      }
      // Slide the window
      this.sessionStore.set(roomKey, now);
    }

    return roomQr;
  }

  /**
   * Public: Resolve room info from QR key
   */
  async resolveRoomInfo(
    roomKey: string,
    isResolve: boolean = false,
  ): Promise<{
    restaurantId: number;
    restaurantName: string;
    roomNo: string;
  }> {
    const roomQr = await this.findByRoomKey(roomKey, isResolve);

    if (!roomQr) {
      throw new NotFoundException('Invalid or expired room QR code session. Please scan the QR code again.');
    }

    return {
      restaurantId: roomQr.restaurantId,
      restaurantName: roomQr.restaurant?.restaurantName || 'Hotel',
      roomNo: roomQr.roomNo,
    };
  }

  /**
   * Admin: Get all room QR codes for a restaurant
   */
  async findAllByRestaurant(
    restaurantId: number,
    frontendUrl?: string,
  ): Promise<RoomQr[]> {
    const qrCodes = await this.roomQrRepository.find({
      where: { restaurantId, isActive: 1 },
      order: { roomNo: 'ASC' },
    });

    if (!frontendUrl) {
      return qrCodes;
    }

    const normalizedFrontendUrl = this.normalizeFrontendUrl(frontendUrl);
    const staleQrCodes = qrCodes.filter(
      (qrCode) => qrCode.qrUrl !== this.buildRoomQrUrl(normalizedFrontendUrl, qrCode.roomKey),
    );

    if (staleQrCodes.length === 0) {
      return qrCodes;
    }

    staleQrCodes.forEach((qrCode) => {
      qrCode.qrUrl = this.buildRoomQrUrl(normalizedFrontendUrl, qrCode.roomKey);
    });

    await this.roomQrRepository.save(staleQrCodes);
    return qrCodes;
  }

  /**
   * Admin: Generate single room QR code
   */
  async generateQrCode(
    restaurantId: number,
    roomNo: string,
    frontendUrl: string = 'http://localhost:3001',
  ): Promise<RoomQr> {
    // Check if room already exists for this restaurant
    const existing = await this.roomQrRepository.findOne({
      where: { restaurantId, roomNo },
    });

    if (existing) {
      throw new ConflictException(`QR code already exists for ${roomNo}`);
    }

    // Generate unique room key
    const roomKey = crypto.randomBytes(32).toString('hex'); // 64 characters

    // Create QR URL
    const qrUrl = this.buildRoomQrUrl(frontendUrl, roomKey);

    const roomQr = this.roomQrRepository.create({
      restaurantId,
      roomNo,
      roomKey,
      qrUrl,
      isActive: 1,
    });

    return this.roomQrRepository.save(roomQr);
  }

  /**
   * Admin: Bulk generate room QR codes (Room 1, Room 2, ..., Room N)
   */
  async generateBulkQrCodes(
    restaurantId: number,
    roomCount: number,
    frontendUrl: string = 'http://localhost:3001',
  ): Promise<RoomQr[]> {
    const generatedRooms: RoomQr[] = [];
    const errors: string[] = [];

    for (let i = 1; i <= roomCount; i++) {
      const roomNo = `Room ${i}`;

      try {
        const roomQr = await this.generateQrCode(restaurantId, roomNo, frontendUrl);
        generatedRooms.push(roomQr);
      } catch (error) {
        // Skip if already exists
        if (error instanceof ConflictException) {
          errors.push(`${roomNo} already exists`);
        } else {
          throw error;
        }
      }
    }

    return generatedRooms;
  }

  /**
   * Admin: Delete one room QR code
   */
  async deleteOne(roomQrId: number, restaurantId: number): Promise<void> {
    const result = await this.roomQrRepository.delete({
      roomQrId,
      restaurantId, // Ensure user can only delete their own restaurant's QR codes
    });

    if (result.affected === 0) {
      throw new NotFoundException('Room QR code not found');
    }
  }

  /**
   * Admin: Delete all room QR codes for a restaurant
   */
  async deleteAllByRestaurant(restaurantId: number): Promise<number> {
    const result = await this.roomQrRepository.delete({ restaurantId });
    return result.affected || 0;
  }
}
