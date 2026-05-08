import type { Service } from './service.entity';

export type CreateServiceData = {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
};

export type UpdateServiceData = Partial<CreateServiceData> & {
  isActive?: boolean;
};

export interface IServiceRepository {
  create(data: CreateServiceData): Promise<Service>;
  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[Service[], number]>;
  findOne(id: string): Promise<Service | null>;
  update(id: string, data: UpdateServiceData): Promise<Service>;
  delete(id: string): Promise<Service>;
}

export const IServiceRepository = Symbol('IServiceRepository');
