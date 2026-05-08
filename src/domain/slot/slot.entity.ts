export type SlotStatus = 'AVAILABLE' | 'FULL' | 'CANCELLED';

export const SlotStatus = {
  AVAILABLE: 'AVAILABLE',
  FULL: 'FULL',
  CANCELLED: 'CANCELLED',
} as const;

export type Slot = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: SlotStatus;
  serviceId: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  bookedCount: number;
};
