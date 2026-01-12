/**
 * Redis Key Patterns
 * 
 * Naming convention: {domain}:{entity}:{identifier}
 * Use functions to generate keys with proper typing
 */

export const RedisKeys = {
  // Driver Location (Geo Set)
  DRIVER_LOCATIONS: 'driver:locations',
  
  // Driver State
  driverState: (driverId: string) => `driver:state:${driverId}`,
  driverBooking: (driverId: string) => `driver:booking:${driverId}`,
  
  // User Session
  userSession: (userId: string) => `user:session:${userId}`,
  
  // Booking State
  bookingState: (bookingId: string) => `booking:state:${bookingId}`,
  bookingLock: (bookingId: string) => `booking:lock:${bookingId}`,
  
  // Active Bookings Set
  ACTIVE_BOOKINGS: 'booking:active',
  
  // Online Drivers Set
  ONLINE_DRIVERS: 'driver:online',
  
  // Available Drivers by Vehicle Type
  availableDrivers: (vehicleType: string) => `driver:available:${vehicleType}`,
  
  // OTP Storage (short TTL)
  otp: (phoneNumber: string) => `otp:${phoneNumber}`,
  
  // Rate Limiting
  rateLimit: (key: string) => `ratelimit:${key}`,
  
  // Locks
  lock: (resource: string) => `lock:${resource}`,
} as const;

// TTL Constants (in seconds)
export const RedisTTL = {
  DRIVER_STATE: 60 * 5,          // 5 minutes
  BOOKING_STATE: 60 * 60,         // 1 hour
  OTP: 60 * 10,                   // 10 minutes
  SESSION: 60 * 60 * 24,          // 24 hours
  LOCK: 30,                       // 30 seconds
  RATE_LIMIT: 60,                 // 1 minute
} as const;

