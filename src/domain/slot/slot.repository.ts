import type { Slot, SlotStatus } from './slot.entity';

export type CreateSlotData = {
  serviceId: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  capacity?: number;
  status: SlotStatus;
};

export type UpdateSlotData = {
  status?: SlotStatus;
  bookedCount?: { increment?: number; decrement?: number };
};

export type FindSlotsParams = {
  skip?: number;
  take?: number;
  serviceId?: string;
  providerId?: string;
  date?: string;
  status?: SlotStatus;
};

export interface ISlotRepository {
  create(data: CreateSlotData): Promise<Slot>;
  findAll(params?: FindSlotsParams): Promise<[Slot[], number]>;
  findOne(id: string): Promise<Slot | null>;
  update(id: string, data: UpdateSlotData): Promise<Slot>;
  delete(id: string): Promise<Slot>;
  findOverlapping(params: {
    providerId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<Slot | null>;
}

export const ISlotRepository = Symbol('ISlotRepository');
