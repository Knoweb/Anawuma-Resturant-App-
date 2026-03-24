import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RestaurantsService } from '../../restaurants/restaurants.service';
import { REQUIRED_FEATURE_KEY } from '../decorators/requires-feature.decorator';
import { RestaurantFeature } from '../enums/restaurant-feature.enum';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private restaurantsService: RestaurantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<RestaurantFeature>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true; // No feature requirement, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.restaurantId) {
      throw new ForbiddenException('Restaurant context required');
    }

    const restaurant = await this.restaurantsService.findById(user.restaurantId);

    if (!restaurant) {
      throw new ForbiddenException('Restaurant not found');
    }

    // Check feature flag based on required feature
    let isEnabled = false;
    switch (requiredFeature) {
      case RestaurantFeature.HOUSEKEEPING:
        isEnabled = restaurant.enableHousekeeping;
        break;
      case RestaurantFeature.KDS:
        isEnabled = restaurant.enableKds;
        break;
      case RestaurantFeature.REPORTS:
        isEnabled = restaurant.enableReports;
        break;
      default:
        isEnabled = false;
    }

    if (!isEnabled) {
      throw new ForbiddenException(
        `The ${requiredFeature} feature is disabled for this restaurant`,
      );
    }

    return true;
  }
}
