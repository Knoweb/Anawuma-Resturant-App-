export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  restaurantId?: number;
  type: 'admin' | 'super_admin';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    access_token: string;
    user: {
      id: number;
      email: string;
      role: string;
      restaurantId?: number;
      restaurantName?: string;
      restaurantLogo?: string;
      type: string;
      restaurantSettings?: {
        enableHousekeeping: boolean;
        enableKds: boolean;
        enableReports: boolean;
        enableAccountant: boolean;
        enableCashier: boolean;
      } | null;
    };
  };
}
