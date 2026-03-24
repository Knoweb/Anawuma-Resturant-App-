import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
  ) { }

  /**
   * Create a new offer
   */
  async create(
    createOfferDto: CreateOfferDto,
    restaurantId: number,
  ): Promise<Offer> {
    // Validate that endDate is after startDate
    const startDate = new Date(createOfferDto.startDate);
    const endDate = new Date(createOfferDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate discount value based on type
    if (createOfferDto.discountType === 'PERCENTAGE') {
      if (createOfferDto.discountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100%');
      }
    }

    const offer = this.offersRepository.create({
      ...createOfferDto,
      restaurantId,
    });

    const savedOffer = await this.offersRepository.save(offer);
    return this.resolveImageUrl(savedOffer);
  }

  /**
   * Find all offers for a restaurant
   */
  async findAll(restaurantId: number): Promise<Offer[]> {
    const offers = await this.offersRepository.find({
      where: { restaurantId },
      order: { createdAt: 'DESC' },
    });
    return offers.map(offer => this.resolveImageUrl(offer));
  }

  /**
   * Find only active offers (within date range and is_active = true)
   */
  async findActiveOffers(restaurantId: number): Promise<Offer[]> {
    const now = new Date();

    const offers = await this.offersRepository.find({
      where: {
        restaurantId,
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
    });
    return offers.map(offer => this.resolveImageUrl(offer));
  }

  /**
   * Find a single offer by ID
   */
  async findOne(offerId: number, restaurantId: number): Promise<Offer> {
    const offer = await this.offersRepository.findOne({
      where: { offerId, restaurantId },
    });

    if (!offer) {
      throw new NotFoundException(
        `Offer with ID ${offerId} not found or does not belong to your restaurant`,
      );
    }

    return this.resolveImageUrl(offer);
  }

  /**
   * Update an existing offer
   */
  async update(
    offerId: number,
    updateOfferDto: UpdateOfferDto,
    restaurantId: number,
  ): Promise<Offer> {
    // First verify the offer exists and belongs to the restaurant
    const offer = await this.findOne(offerId, restaurantId);

    // Validate dates if both are being updated or if one is being updated
    const startDate = updateOfferDto.startDate
      ? new Date(updateOfferDto.startDate)
      : offer.startDate;
    const endDate = updateOfferDto.endDate
      ? new Date(updateOfferDto.endDate)
      : offer.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate discount value if type is being updated
    const discountType = updateOfferDto.discountType || offer.discountType;
    const discountValue =
      updateOfferDto.discountValue !== undefined
        ? updateOfferDto.discountValue
        : offer.discountValue;

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // Merge the updates
    Object.assign(offer, updateOfferDto);

    const updatedOffer = await this.offersRepository.save(offer);
    return this.resolveImageUrl(updatedOffer);
  }

  /**
   * Remove (delete) an offer
   */
  async remove(offerId: number, restaurantId: number): Promise<void> {
    const offer = await this.findOne(offerId, restaurantId);
    await this.offersRepository.remove(offer);
  }

  /**
   * Calculate the final price after applying discount
   * @param price Original price
   * @param offer Offer entity with discount type and value
   * @returns Final price after discount (never negative)
   */
  calculateDiscount(price: number, offer: Offer): number {
    let discount = 0;

    if (offer.discountType === 'PERCENTAGE') {
      discount = price * (offer.discountValue / 100);
    } else if (offer.discountType === 'FIXED') {
      discount = offer.discountValue;
    }

    const finalPrice = price - discount;
    return finalPrice < 0 ? 0 : parseFloat(finalPrice.toFixed(2));
  }

  private resolveImageUrl(offer: Offer): Offer {
    if (offer.imageUrl && !offer.imageUrl.startsWith('http')) {
      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      offer.imageUrl = `${baseUrl}${offer.imageUrl}`;
    }
    return offer;
  }
}
