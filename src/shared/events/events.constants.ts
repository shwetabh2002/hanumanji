/**
 * Domain Events - Used for cross-module communication within the monolith
 * 
 * Naming convention: {domain}.{entity}.{action}
 * Example: user.registered, booking.created, driver.location.updated
 */

export const DomainEvents = {
  // User Events
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_PROFILE_UPDATED: 'user.profile.updated',

  // Driver Events
  DRIVER_REGISTERED: 'driver.registered',
  DRIVER_VERIFIED: 'driver.verified',
  DRIVER_ONLINE: 'driver.online',
  DRIVER_OFFLINE: 'driver.offline',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',

  // Booking Events
  BOOKING_CREATED: 'booking.created',
  BOOKING_ACCEPTED: 'booking.accepted',
  BOOKING_REJECTED: 'booking.rejected',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_STARTED: 'booking.started',
  BOOKING_COMPLETED: 'booking.completed',

  // Payment Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Notification Events (consumed by notification service)
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type DomainEventType = typeof DomainEvents[keyof typeof DomainEvents];

// Event Payload Types
export interface UserRegisteredPayload {
  userId: string;
  phoneNumber: string;
}

export interface UserVerifiedPayload {
  userId: string;
  phoneNumber: string;
}

export interface DriverLocationUpdatedPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface DriverStatusPayload {
  driverId: string;
  status: 'online' | 'offline';
}

export interface BookingCreatedPayload {
  bookingId: string;
  userId: string;
  pickupLocation: { lat: number; lng: number; address: string };
  dropLocation: { lat: number; lng: number; address: string };
  vehicleType: string;
  estimatedFare: number;
}

export interface BookingAcceptedPayload {
  bookingId: string;
  driverId: string;
  userId: string;
  estimatedArrival: number; // minutes
}

export interface BookingCompletedPayload {
  bookingId: string;
  driverId: string;
  userId: string;
  finalFare: number;
  distance: number;
  duration: number;
}

export interface PaymentCompletedPayload {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  method: string;
}

export interface NotificationPayload {
  userId: string;
  type: 'push' | 'sms' | 'email';
  title: string;
  body: string;
  data?: Record<string, any>;
}

