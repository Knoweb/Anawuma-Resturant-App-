import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

// File validation for menu images
export const menuImageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|ico)$/i)) {
    return callback(
      new BadRequestException('Only image files are allowed!'),
      false,
    );
  }
  callback(null, true);
};

// Storage configuration for menu images
export const menuImageStorage = diskStorage({
  destination: './uploads/menus',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `menu-${uniqueSuffix}${ext}`);
  },
});

// File size limit (5MB)
export const maxMenuImageFileSize = 5 * 1024 * 1024;
