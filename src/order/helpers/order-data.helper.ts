// ========================================
// ⚠️ DEPRECATED: ORDER DATA HELPER
// ========================================
// This helper is deprecated. Please use OrderBusinessService instead.
// Location: src/order/services/order-business.service.ts

import { TicketType } from '../../common/enums';
import { CreateOrderRequest } from '../order.service';
import { User } from '../../user/user.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { OrderBusinessService } from '../services/order-business.service';
import { ConfigService } from '@nestjs/config';

export interface OrderDataResult {
  orderData: any;
  pricing: {
    totalAmount: number;
    commission: number;
  };
}

/**
 * @deprecated Use OrderBusinessService instead
 */
export class OrderDataHelper {
  /**
   * @deprecated Use OrderBusinessService.createBaseOrderData() instead
   */
  static createBaseOrderData(
    request: CreateOrderRequest,
    user: User,
    referrer: Referrer | null,
    configService: ConfigService,
  ): OrderDataResult {
    console.warn(
      'OrderDataHelper.createBaseOrderData is deprecated. Use OrderBusinessService.createBaseOrderData instead.',
    );

    const orderBusinessService = new OrderBusinessService(configService);
    return orderBusinessService.createBaseOrderData(request, user, referrer);
  }

  /**
   * @deprecated Use OrderBusinessService.addStandingTicketData() instead
   */
  static addStandingTicketData(
    orderData: any,
    request: CreateOrderRequest,
  ): void {
    console.warn(
      'OrderDataHelper.addStandingTicketData is deprecated. Use OrderBusinessService.addStandingTicketData instead.',
    );

    const orderBusinessService = new OrderBusinessService({} as ConfigService);
    orderBusinessService.addStandingTicketData(orderData, request);
  }

  /**
   * @deprecated Use OrderBusinessService.setStandingOrderStatus() instead
   */
  static setStandingOrderStatus(
    orderData: any,
    request: CreateOrderRequest,
  ): void {
    console.warn(
      'OrderDataHelper.setStandingOrderStatus is deprecated. Use OrderBusinessService.setStandingOrderStatus instead.',
    );

    const orderBusinessService = new OrderBusinessService({} as ConfigService);
    orderBusinessService.setStandingOrderStatus(orderData, request);
  }

  /**
   * @deprecated Use OrderBusinessService.calculateOrderPricing() instead
   */
  private static calculateOrderPricing(request: CreateOrderRequest): {
    totalAmount: number;
    commission: number;
  } {
    console.warn(
      'OrderDataHelper.calculateOrderPricing is deprecated. Use OrderBusinessService.calculateOrderPricing instead.',
    );

    const orderBusinessService = new OrderBusinessService({} as ConfigService);
    return orderBusinessService.calculateOrderPricing(request);
  }

  /**
   * @deprecated Use OrderBusinessService.calculateSeatPricing() instead
   */
  static calculateSeatPricing(
    ticketType: TicketType,
    seatCount: number,
  ): {
    totalAmount: number;
    commission: number;
  } {
    console.warn(
      'OrderDataHelper.calculateSeatPricing is deprecated. Use OrderBusinessService.calculateSeatPricing instead.',
    );

    const orderBusinessService = new OrderBusinessService({} as ConfigService);
    return orderBusinessService.calculateSeatPricing(ticketType, seatCount);
  }

  /**
   * @deprecated All validation methods moved to OrderBusinessService
   */
  private static validateStandingTicketConstants(): void {
    console.warn(
      'OrderDataHelper.validateStandingTicketConstants is deprecated. Validation is now handled in OrderBusinessService.',
    );
  }
}
