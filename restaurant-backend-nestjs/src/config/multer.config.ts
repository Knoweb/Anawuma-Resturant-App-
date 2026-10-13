import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

/**
 * Multer configuration for file uploads
 * Handles storage location, filename generation, and file validation
 */

// Allowed file types
export const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  const isImageMime = file.mimetype && file.mimetype.toLowerCase().startsWith('image/');
  const isImageExt = Boolean(
    file.originalname &&
    file.originalname.match(/\.(jpg|jpeg|png|gif|webp|ico|jfif|avif|bmp|tiff|heic|heif|svg)$/i),
  );

  if (isImageMime || isImageExt) {
    return callback(null, true);
  }

  return callback(
    new BadRequestException('Only image files are allowed! (e.g. JPG, PNG, WEBP, JFIF, AVIF, GIF)'),
    false,
  );
};

import * as fs from 'fs';

// Storage configuration for offer images
export const offerImageStorage = diskStorage({
  destination: (req, file, callback) => {
    const uploadPath = './uploads/offers';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    callback(null, uploadPath);
  },
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
  destination: (req, file, callback) => {
    const uploadPath = './uploads/logos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    callback(null, uploadPath);
  },
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
