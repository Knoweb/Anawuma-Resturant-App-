import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

import * as fs from 'fs';

// File validation for category images
export const categoryImageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
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

// Storage configuration for category images
export const categoryImageStorage = diskStorage({
  destination: (req, file, callback) => {
    const uploadPath = './uploads/categories';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    callback(null, uploadPath);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = extname(file.originalname).toLowerCase();
    if (!ext || ext === '.jfif') {
      if (file.mimetype?.includes('png')) ext = '.png';
      else if (file.mimetype?.includes('webp')) ext = '.webp';
      else if (file.mimetype?.includes('gif')) ext = '.gif';
      else if (file.mimetype?.includes('avif')) ext = '.avif';
      else ext = '.jpg';
    }
    callback(null, `category-${uniqueSuffix}${ext}`);
  },
});

// File size limit (5MB)
export const maxCategoryImageFileSize = 5 * 1024 * 1024;
