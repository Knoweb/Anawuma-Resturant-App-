import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { SuperAdmin } from './entities/super-admin.entity';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // First, check if super admin (higher priority)
    const superAdmin = await this.superAdminRepository.findOne({
      where: { email },
    });

    if (superAdmin) {
      // Verify password - handle PHP's $2y$ bcrypt format by converting to $2a$
      const hashToCompare = superAdmin.password.replace(/^\$2y\$/, '$2a$');
      const isPasswordValid = await bcrypt.compare(password, hashToCompare);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid password.',
        };
      }

      // Generate JWT token
      const payload: JwtPayload = {
        userId: superAdmin.superAdminId,
        email: superAdmin.email,
        role: 'super_admin',
        type: 'super_admin',
      };

      const access_token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Super Admin login successful.',
        data: {
          access_token,
          user: {
            id: superAdmin.superAdminId,
            email: superAdmin.email,
            role: 'super_admin',
            type: 'super_admin',
          },
        },
      };
    }

    // If not super admin, try admin
    const admin = await this.adminRepository.findOne({
      where: { email },
      relations: ['restaurant'],
    });

    if (admin) {
      // Verify password - handle PHP's $2y$ bcrypt format by converting to $2a$
      const hashToCompare = admin.password.replace(/^\$2y\$/, '$2a$');
      const isPasswordValid = await bcrypt.compare(password, hashToCompare);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid password.',
        };
      }


      // Check if restaurant subscription is active (for non-housekeeper roles)
      if (admin.role !== 'housekeeper' && admin.restaurant) {
        // Check approval status first
        if (admin.restaurant.approvalStatus === 'pending') {
          return {
            success: false,
            message: 'Your registration is pending approval by the super admin. You will be notified once approved.',
          };
        }

        if (admin.restaurant.approvalStatus === 'rejected') {
          return {
            success: false,
            message: 'Your registration has been rejected. Please contact support for more information.',
          };
        }

        if (admin.restaurant.subscriptionStatus !== 'active') {
          return {
            success: false,
            message: 'Your subscription is inactive. Please contact support.',
          };
        }

        // Check subscription expiry
        const now = new Date();
        const expiryDate = new Date(admin.restaurant.subscriptionExpiryDate);
        if (expiryDate < now) {
          return {
            success: false,
            message: 'Your subscription has expired. Please renew your subscription.',
          };
        }
      }

      // Generate JWT token
      const payload: JwtPayload = {
        userId: admin.adminId,
        email: admin.email,
        role: admin.role,
        restaurantId: admin.restaurantId,
        type: 'admin',
      };

      const access_token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Login successful.',
        data: {
          access_token,
          user: {
            id: admin.adminId,
            email: admin.email,
            role: admin.role,
            restaurantId: admin.restaurantId,
            restaurantName: admin.restaurant?.restaurantName,
            restaurantLogo: admin.restaurant?.logo,
            type: 'admin',
            restaurantSettings: admin.restaurant ? {
              enableHousekeeping: admin.restaurant.enableHousekeeping,
              enableKds: admin.restaurant.enableKds,
              enableReports: admin.restaurant.enableReports,
              enableAccountant: admin.restaurant.enableAccountant,
              enableCashier: admin.restaurant.enableCashier,
            } : null,
          },
        },
      };
    }

    // No user found
    return {
      success: false,
      message: 'No account found with this email.',
    };
  }

  async validateUser(userId: number, type: 'admin' | 'super_admin') {
    if (type === 'admin') {
      const admin = await this.adminRepository.findOne({
        where: { adminId: userId },
        relations: ['restaurant'],
      });
      return admin;
    } else {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { superAdminId: userId },
      });
      return superAdmin;
    }
  }

  async registerRestaurant(
    registerDto: RegisterRestaurantDto,
    logoPath: string,
  ): Promise<{
    restaurantId: number;
    adminId: number;
    email: string;
    subscriptionStatus: string;
    approvalStatus: string;
  }> {
    const {
      restaurantName,
      address,
      contactNumber,
      email,
      password,
      confirmPassword,
      openingTime,
      closingTime,
      enableHousekeeping,
      enableKds,
      enableReports,
    } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const trialExpiryDate = new Date();
    trialExpiryDate.setDate(trialExpiryDate.getDate() + 30);

    return this.restaurantRepository.manager.transaction(async (manager) => {
      const restaurantRepo = manager.getRepository(Restaurant);
      const adminRepo = manager.getRepository(Admin);
      const superAdminRepo = manager.getRepository(SuperAdmin);

      const [existingRestaurant, existingAdmin, existingSuperAdmin] =
        await Promise.all([
          restaurantRepo.findOne({ where: { email } }),
          adminRepo.findOne({ where: { email } }),
          superAdminRepo.findOne({ where: { email } }),
        ]);

      if (existingRestaurant || existingAdmin || existingSuperAdmin) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const restaurant = restaurantRepo.create({
        restaurantName,
        address,
        contactNumber,
        email,
        password: hashedPassword,
        openingTime,
        closingTime,
        logo: logoPath,
        subscriptionStatus: 'inactive',
        approvalStatus: 'pending',
        packageId: 3,
        enableSteward: false,
        enableHousekeeping: enableHousekeeping ?? true,
        enableKds: enableKds ?? true,
        enableReports: enableReports ?? true,
      });

      const savedRestaurant = await restaurantRepo.save(restaurant);

      const admin = adminRepo.create({
        email,
        password: hashedPassword,
        role: 'admin',
        restaurantId: savedRestaurant.restaurantId,
      });

      const savedAdmin = await adminRepo.save(admin);

      return {
        restaurantId: savedRestaurant.restaurantId,
        adminId: savedAdmin.adminId,
        email: savedRestaurant.email,
        subscriptionStatus: savedRestaurant.subscriptionStatus,
        approvalStatus: savedRestaurant.approvalStatus,
      };
    });
  }

  /**
   * Create a new admin (Super Admin can create any, Restaurant Admin can only create their own staff)
   */
  async createAdmin(createAdminDto: CreateAdminDto, ownerRestaurantId?: number): Promise<Admin> {
    // If ownerRestaurantId is provided (called by a restaurant owner), enforce it
    if (ownerRestaurantId) {
      createAdminDto.restaurantId = ownerRestaurantId;
      
      // Prevent owners from creating other owners or super admins
      if (createAdminDto.role === 'admin' || createAdminDto.role === 'super_admin') {
        throw new UnauthorizedException('You can only create staff roles (kitchen, cashier, etc.)');
      }
    }

    // Check if email already exists
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    // Create admin
    const admin = this.adminRepository.create({
      email: createAdminDto.email,
      password: hashedPassword,
      role: createAdminDto.role,
      restaurantId: createAdminDto.restaurantId,
    });

    return this.adminRepository.save(admin);
  }

  /**
   * Get all admins (Super Admin only)
   */
  async getAllAdmins(): Promise<Admin[]> {
    return this.adminRepository.find({
      relations: ['restaurant'],
      order: { adminId: 'DESC' },
    });
  }

  async deleteAdmin(adminId: number, ownerRestaurantId?: number): Promise<void> {
    if (ownerRestaurantId) {
      const admin = await this.adminRepository.findOne({
        where: { adminId },
      });

      if (!admin || admin.restaurantId !== ownerRestaurantId) {
        throw new UnauthorizedException('You can only delete staff from your own restaurant');
      }

      // Prevent owner from deleting themselves via this endpoint (usually they are the only 'admin' role)
      if (admin.role === 'admin') {
         throw new UnauthorizedException('You cannot delete the primary owner account');
      }
    }

    await this.adminRepository.delete(adminId);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: number,
    type: 'admin' | 'super_admin',
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (type === 'admin') {
      const admin = await this.adminRepository.findOne({
        where: { adminId: userId },
      });

      if (!admin) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const hashToCompare = admin.password.replace(/^\$2y\$/, '$2a$');
      const isPasswordValid = await bcrypt.compare(currentPassword, hashToCompare);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      admin.password = hashedPassword;
      await this.adminRepository.save(admin);
    } else {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { superAdminId: userId },
      });

      if (!superAdmin) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const hashToCompare = superAdmin.password.replace(/^\$2y\$/, '$2a$');
      const isPasswordValid = await bcrypt.compare(currentPassword, hashToCompare);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      superAdmin.password = hashedPassword;
      await this.superAdminRepository.save(superAdmin);
    }
  }

  /**
   * Update profile for authenticated user
   */
  async updateProfile(
    userId: number,
    type: 'admin' | 'super_admin',
    email?: string,
    name?: string,
  ): Promise<Admin | SuperAdmin> {
    if (type === 'admin') {
      const admin = await this.adminRepository.findOne({
        where: { adminId: userId },
      });

      if (!admin) {
        throw new UnauthorizedException('User not found');
      }

      if (email && email !== admin.email) {
        // Check if new email already exists
        const existingAdmin = await this.adminRepository.findOne({
          where: { email },
        });

        if (existingAdmin && existingAdmin.adminId !== userId) {
          throw new ConflictException('Email already in use');
        }

        admin.email = email;
      }

      return this.adminRepository.save(admin);
    } else {
      const superAdmin = await this.superAdminRepository.findOne({
        where: { superAdminId: userId },
      });

      if (!superAdmin) {
        throw new UnauthorizedException('User not found');
      }

      if (email && email !== superAdmin.email) {
        // Check if new email already exists
        const existingSuperAdmin = await this.superAdminRepository.findOne({
          where: { email },
        });

        if (existingSuperAdmin && existingSuperAdmin.superAdminId !== userId) {
          throw new ConflictException('Email already in use');
        }

        superAdmin.email = email;
      }

      if (name) {
        superAdmin.name = name;
      }

      return this.superAdminRepository.save(superAdmin);
    }
  }
}
