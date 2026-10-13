import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

import * as fs from 'fs';

// File validation for restaurant logos
export const logoFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|ico)$/i)) {
    return callback(
      new BadRequestException('Only image files are allowed!'),
      false,
    );
  }
  callback(null, true);
};

// Storage configuration for restaurant logos
export const restaurantLogoStorage = diskStorage({
  destination: (req, file, callback) => {
    const uploadPath = './uploads/restaurants';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    callback(null, uploadPath);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `restaurant-${uniqueSuffix}${ext}`);
  },
});

// File size limit (5MB)
export const maxLogoFileSize = 5 * 1024 * 1024;
