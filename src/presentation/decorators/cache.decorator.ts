import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const IGNORE_CACHE_KEY = 'ignore_cache';

/**
 * Define the TTL (in seconds) for caching the endpoint response.
 * @param ttlSeconds Time to live in seconds
 */
export const CacheTTL = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * Ignore caching for the endpoint.
 */
export const IgnoreCache = () => SetMetadata(IGNORE_CACHE_KEY, true);
