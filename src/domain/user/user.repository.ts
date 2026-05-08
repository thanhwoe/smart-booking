import type { User } from './user.entity';

// ─── Input types ─────────────────────────────────────────────────────────────

export type CreateUserData = {
  clerkId: string;
  email: string;
  name: string;
  phone?: string | null;
};

export type UpdateUserData = Partial<Pick<User, 'name' | 'email' | 'phone'>>;

// ─── Port / Interface ─────────────────────────────────────────────────────────

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(params?: { skip?: number; take?: number }): Promise<[User[], number]>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  syncClerkUser(data: CreateUserData): Promise<User>;
  deleteByClerkId(clerkId: string): Promise<User>;
}

// Symbol used as DI injection token (avoids import issues with interfaces)
export const IUserRepository = Symbol('IUserRepository');
