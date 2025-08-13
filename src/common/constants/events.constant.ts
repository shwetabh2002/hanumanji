export const KAFKA_TOPICS = {
  // Booking Events
  BOOKING_CREATED: 'booking.created',
  BOOKING_ACCEPTED: 'booking.accepted',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  
  // Trip Events
  TRIP_STARTED: 'trip.started',
  TRIP_COMPLETED: 'trip.completed',
  TRIP_CANCELLED: 'trip.cancelled',
  
  // Driver Events
  DRIVER_AVAILABLE: 'driver.available',
  DRIVER_UNAVAILABLE: 'driver.unavailable',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_ARRIVED: 'driver.arrived',
  
  // User Events
  USER_REGISTERED: 'user.registered',
  USER_LOCATION_UPDATED: 'user.location.updated',
  
  // Payment Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Notification Events
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_DELIVERED: 'notification.delivered',
} as const;

export const KAFKA_CONSUMER_GROUPS = {
  BOOKING_SERVICE: 'booking-service-group',
  DRIVER_SERVICE: 'driver-service-group',
  USER_SERVICE: 'user-service-group',
  PAYMENT_SERVICE: 'payment-service-group',
  NOTIFICATION_SERVICE: 'notification-service-group',
  LOCATION_SERVICE: 'location-service-group',
} as const;

export const WEBSOCKET_EVENTS = {
  // Driver Events
  DRIVER_LOCATION_UPDATE: 'driver:location:update',
  NEW_BOOKING_REQUEST: 'driver:booking:new',
  BOOKING_CANCELLED: 'driver:booking:cancelled',
  
  // User Events
  DRIVER_FOUND: 'user:driver:found',
  DRIVER_LOCATION: 'user:driver:location',
  TRIP_STATUS_UPDATE: 'user:trip:status',
  BOOKING_STATUS_UPDATE: 'user:booking:status',
  
  // Common Events
  NOTIFICATION: 'notification',
  ERROR: 'error',
  DISCONNECT: 'disconnect',
  CONNECT: 'connect',
} as const; 