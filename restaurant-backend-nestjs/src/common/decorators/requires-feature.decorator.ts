import { SetMetadata } from '@nestjs/common';
import { RestaurantFeature } from '../enums/restaurant-feature.enum';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';
export const RequiresFeature = (feature: RestaurantFeature) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
