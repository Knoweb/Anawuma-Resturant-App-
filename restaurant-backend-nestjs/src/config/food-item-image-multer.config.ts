import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

// File validation for food item images
export const foodItemImageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|ico)$/i)) {
    return callback(
      new BadRequestException('Only image files are allowed!'),
      false,
    );
  }
  callback(null, true);
};

// Storage configuration for food item images
export const foodItemImageStorage = diskStorage({
  destination: './uploads/food-items',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `food-item-${uniqueSuffix}${ext}`);
  },
});

// File size limit (5MB)
export const maxFoodItemImageFileSize = 5 * 1024 * 1024;
