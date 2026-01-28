export enum UserRole {
  USER = 'user',
}

export enum UserType {
  USER = 'user',
  DRIVER = 'driver',
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
  // Registration & Approval States
  PENDING_APPROVAL = 'pending_approval',     // Registered, awaiting admin approval
  DOCUMENTS_PENDING = 'documents_pending',   // Approved but documents incomplete
  APPROVED = 'approved',                     // Fully approved and verified
  REJECTED = 'rejected',                     // Registration rejected

  // Operational States (only for approved drivers)
  OFFLINE = 'offline',                       // Approved driver, currently offline
  ONLINE = 'online',                         // Approved driver, accepting rides
  BUSY = 'busy',                             // Approved driver, on a ride
}

export enum DocumentVerificationStatus {
  NOT_UPLOADED = 'not_uploaded',
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
} 