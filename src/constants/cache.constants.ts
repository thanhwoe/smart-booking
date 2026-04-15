export const CACHE_KEY = {
  USER_BY_CLERK_ID: (clerkId: string) => `user:clerk:${clerkId}`,
  USER_BY_ID: (id: string) => `user:${id}`,

  SLOT_BY_ID: (id: string) => `slot:${id}`,

  SERVICE_BY_ID: (id: string) => `service:${id}`,

  BOOKING_BY_ID: (id: string) => `booking:${id}`,
};

export const CACHE_TTL = {
  USER: 60,
  SLOT: 60,
  SERVICE: 300,
  BOOKING: 30,
};
