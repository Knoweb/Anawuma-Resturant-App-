import { Controller, Get, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('plans')
  getPlans(@Query('discount') discount?: string) {
    const parsedDiscount = Number.parseInt(discount ?? '', 10);

    return {
      success: true,
      data: this.pricingService.getPlans(
        Number.isNaN(parsedDiscount) ? undefined : parsedDiscount,
      ),
    };
  }
}
