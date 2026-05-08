/**
 * Port: ILockService
 * Application layer abstraction over any distributed lock implementation (Redlock, etc.)
 */
export interface ILockService {
  withLock<T>(
    id: string,
    fn: () => Promise<T>,
    prefix?: string,
    ttlMs?: number,
  ): Promise<T>;
}

export const ILockService = Symbol('ILockService');
