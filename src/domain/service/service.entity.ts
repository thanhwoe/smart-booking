import { Decimal } from '@prisma/client/runtime/client';

export type Service = {
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  durationMinutes: number;
  price: Decimal;
  isActive: boolean;
};
