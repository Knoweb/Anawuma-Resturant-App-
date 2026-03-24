import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

/**
 * Multer configuration for file uploads
 * Handles storage location, filename generation, and file validation
 */

// Allowed file types
export const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return callback(
      new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif, webp)'),
      false,
    );
  }
  callback(null, true);
};

// Storage configuration for offer images
export const offerImageStorage = diskStorage({
  destination: './uploads/offers',
  filename: (req, file, callback) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `offer-${uniqueSuffix}${ext}`;
    callback(null, filename);
  },
});

// Storage configuration for restaurant logos
export const logoStorage = diskStorage({
  destination: './uploads/logos',
  filename: (req, file, callback) => {
    // Generate unique filename: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `logo-${uniqueSuffix}${ext}`;
    callback(null, filename);
  },
});

// File size limit (5MB)
export const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
