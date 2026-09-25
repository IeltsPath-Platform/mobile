export type RoleName = 'ADMIN' | 'CUSTOMER' | 'CONTENT_AUTHOR' | 'EXAMINER' | 'SALES_STAFF';

export type AuthTokenResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
};

export type MessageResponse = {
  message: string;
};

export type RoleResponse = {
  id: string;
  name: RoleName | string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | string;

export type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  status: UserStatus;
  roles: RoleResponse[];
  createdAt: string;
  updatedAt: string;
};
