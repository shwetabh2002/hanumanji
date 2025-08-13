export enum UserRole {
  USER = 'user',

}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',  
  DRIVER_ARRIVED = 'driver_arrived',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum VehicleType {
  BIKE = 'bike',
  AUTO = 'auto',
  CAB = 'cab',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  WALLET = 'wallet',
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
} 