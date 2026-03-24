import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { RestaurantsService } from '../../restaurants/restaurants.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Check for API key in header or query parameter
    const apiKey =
      (req.headers['x-api-key'] as string) ||
      (req.query['apiKey'] as string);

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key. Provide via x-api-key header or apiKey query param');
    }

    const restaurant = await this.restaurantsService.findByApiKey(apiKey);
    if (!restaurant) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach restaurantId to request for use in controller/service
    (req as any).restaurantId = restaurant.restaurantId;

    return true;
  }
}
