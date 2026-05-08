/**
 * Port: ICacheService
 * Application layer abstraction over any cache implementation (Redis, in-memory, etc.)
 * Lives in the application layer so use cases can depend on it without knowing Redis details.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Cache-aside: return cached value or call fetcher, then cache result */
  wrap<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T>;
}

export const ICacheService = Symbol('ICacheService');
