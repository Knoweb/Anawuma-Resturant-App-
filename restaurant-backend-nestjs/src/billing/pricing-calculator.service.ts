import { Injectable } from '@nestjs/common';

export type DiscountType = 'NONE' | 'PERCENTAGE' | 'FIXED';
export type DiningType = 'DINE_IN' | 'TAKEAWAY';

export interface FinalBillCalculation {
  subtotal: number;
  serviceCharge: number;
  grossTotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  diningType: DiningType;
}

@Injectable()
export class PricingCalculatorService {
  /**
   * Single Source of Truth calculation engine for final bill calculations.
   *
   * Business Rules:
   * 1. Service Charge: DINE_IN defaults to 10% on Subtotal. TAKEAWAY is strictly 0% (Rs. 0.00).
   * 2. Gross Total = Subtotal + Service Charge.
   * 3. Discount is applied to Gross Total (Subtotal + Service Charge).
   * 4. PERCENTAGE: Gross Total * (min(100, max(0, discountValue)) / 100).
   * 5. FIXED: min(Gross Total, max(0, discountValue)).
   * 6. Total Amount Due = max(0, Gross Total - Discount Amount).
   */
  calculateFinalBill(
    subtotal: number,
    serviceChargeOrRate: number,
    discountType: DiscountType = 'NONE',
    discountValue: number = 0,
    isRate: boolean = false,
    diningType: DiningType = 'DINE_IN',
  ): FinalBillCalculation {
    const safeSubtotal = Number(Math.max(0, Number(subtotal) || 0).toFixed(2));
    const isTakeaway = String(diningType).toUpperCase() === 'TAKEAWAY';

    const serviceCharge = isTakeaway
      ? 0
      : (isRate
          ? Number(((safeSubtotal * Math.max(0, Number(serviceChargeOrRate) || 0)) / 100).toFixed(2))
          : Number(Math.max(0, Number(serviceChargeOrRate) || 0).toFixed(2)));

    const grossTotal = Number((safeSubtotal + serviceCharge).toFixed(2));

    const safeDiscountVal = Number(Math.max(0, Number(discountValue) || 0));
    let discountAmount = 0;
    const normalizedType: DiscountType = (['PERCENTAGE', 'FIXED', 'NONE'].includes(String(discountType).toUpperCase())
      ? String(discountType).toUpperCase()
      : 'NONE') as DiscountType;

    if (normalizedType === 'PERCENTAGE') {
      const percentage = Math.min(100, safeDiscountVal);
      discountAmount = Number(((grossTotal * percentage) / 100).toFixed(2));
    } else if (normalizedType === 'FIXED') {
      discountAmount = Number(Math.min(grossTotal, safeDiscountVal).toFixed(2));
    } else {
      discountAmount = 0;
    }

    const totalAmount = Number(Math.max(0, grossTotal - discountAmount).toFixed(2));

    return {
      subtotal: safeSubtotal,
      serviceCharge,
      grossTotal,
      discountType: normalizedType,
      discountValue: safeDiscountVal,
      discountAmount,
      totalAmount,
      diningType: isTakeaway ? 'TAKEAWAY' : 'DINE_IN',
    };
  }
}

