import { Injectable } from '@nestjs/common';

type PricingPlanTemplate = {
  key: string;
  title: string;
  originalPrice: number;
  description: string;
  ctaPackage: string;
  features: string[];
};

@Injectable()
export class PricingService {
  private readonly allowedDiscount = 8;

  private readonly plans: PricingPlanTemplate[] = [
    {
      key: 'basic',
      title: 'Basic Plan',
      originalPrice: 25,
      description: 'Includes basic Table QR functionality for easy table ordering via QR codes.',
      ctaPackage: 'basic',
      features: [
        'Add Menus',
        'Add Food Items',
        'Orders Tracking',
        'Billing',
        '10 tables/ QR codes per store',
        'Manage 1 store',
      ],
    },
    {
      key: 'standard',
      title: 'Standard Plan',
      originalPrice: 50,
      description:
        'Includes Table QR ordering and Special Offers management to promote deals directly to customers.',
      ctaPackage: 'standard',
      features: [
        'Add Menus',
        'Add Food Items',
        'Orders Tracking',
        'Billing',
        'Special Offers',
        'Access to sales and revenue report',
        '15 tables/ QR codes per store',
        'Manage up to 2 stores',
      ],
    },
    {
      key: 'premium',
      title: 'Premium Plan',
      originalPrice: 75,
      description:
        'Includes Table QR, Special Offers, and Room QR with Housekeeping management for complete restaurant and hotel service integration.',
      ctaPackage: 'gold',
      features: [
        'Add Menus',
        'Add Food Items',
        'Orders Tracking',
        'Billing',
        'Special Offers',
        'Access to sales and revenue report',
        'Room QR with Housekeeping',
        '15 tables/ QR codes per store',
        'Manage up to 2 stores',
      ],
    },
  ];

  getPlans(rawDiscount?: number) {
    const discount = this.normalizeDiscount(rawDiscount);

    return {
      discount,
      currency: 'USD',
      billingPeriod: 'monthly',
      title: 'Stop Losing Orders to Long Wait Times.',
      subtitle: 'Pricing Package',
      plans: this.plans.map((plan) => ({
        ...plan,
        finalPrice: this.applyDiscount(plan.originalPrice, discount),
      })),
    };
  }

  private normalizeDiscount(rawDiscount?: number): number {
    return rawDiscount === this.allowedDiscount ? this.allowedDiscount : 0;
  }

  private applyDiscount(price: number, discount: number): number {
    return Number((price * (1 - discount / 100)).toFixed(2));
  }
}
