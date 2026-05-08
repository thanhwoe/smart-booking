export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN',
} as const;

export type User = {
  name: string;
  id: string;
  clerkId: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
