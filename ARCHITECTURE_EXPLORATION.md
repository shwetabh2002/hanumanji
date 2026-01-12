# Hanumanji2 Repository - Complete Architecture Exploration Report

## Executive Summary

The Hanumanji2 repository is a ride-hailing backend application built with NestJS, MongoDB, Redis, and Kafka. Currently, **Drivers and Users are implemented as SEPARATE, DUPLICATE systems** with nearly identical structures. This document provides a comprehensive analysis of both systems to enable consolidation.

---

## 1. DATABASE SCHEMA OVERVIEW

### 1.1 CURRENT DRIVERS SCHEMA (Duplicate Versions)

There are **TWO driver schema implementations**:

#### Version 1: `/src/modules/database/schemas/driver.schema.ts` (Legacy)
**Path:** `/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2/src/modules/database/schemas/driver.schema.ts`

```typescript
// Key Fields:
- phoneNumber (unique, required)
- countryCode (default: '+91')
- firstName, lastName
- email (optional)
- vehicleNumber (unique, required)
- vehicleModel (required)
- drivingLicense (required)
- aadhaarLast4 (optional)
- bankAccount { accountNumber, ifsc, accountHolder }
- verificationStatus: enum ['APPROVED_PENDING_DOCS', 'DOCS_UPLOADED', 'VERIFIED', 'REJECTED']
- canGoOnline: boolean (default: true)
- isVerified: boolean (default: false)
- isActive: boolean (default: true)
- status: enum ['offline', 'online', 'busy'] (default: 'offline')
- serviceArea { type: Point, coordinates, radius }
- documents { license, rc, aadhaar, photo } (each with url and verified flag)
- documentsDeadline: Date
- approvedAt: Date
- currentRideId: string
- totalRides: number (default: 0)
- totalEarnings: number (default: 0)
- averageRating: number (default: 5.0)
- totalRatings: number (default: 0)
```

**Indexes:**
- phoneNumber: 1
- vehicleNumber: 1
- status: 1
- verificationStatus: 1
- serviceArea.coordinates: 2dsphere

---

#### Version 2: `/src/modules/driver/schemas/driver.schema.ts` (Modern)
**Path:** `/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2/src/modules/driver/schemas/driver.schema.ts`

```typescript
// More comprehensive structure with nested schemas:

@Schema class DriverVehicle {
  type: VehicleType (BIKE, AUTO, CAB)
  make, model, year, color
  registrationNumber (unique)
  insuranceNumber, insuranceExpiry
  rcNumber
}

@Schema class DriverLocation {
  coordinates: [number, number] (longitude, latitude)
  address
  heading, speed, accuracy
  lastUpdated: Date
}

@Schema class DriverStats {
  rating: number (default: 5.0)
  totalRides: number (default: 0)
  totalEarnings: number (default: 0)
  completionRate: number (default: 100)
  cancellationRate: number (default: 0)
}

@Schema class DriverPreferredArea {
  area: string
  priority: number (default: 1)
}

@Schema class DriverBankDetails {
  accountNumber, ifscCode, bankName, holderName
}

@Schema class Driver {
  phoneNumber (unique, required)
  countryCode (default: '+91')
  language: enum ['en', 'hi'] (default: 'en')
  firstName, lastName
  email (unique, sparse)
  password (optional)
  status: DriverStatus (OFFLINE, ONLINE, BUSY)
  isPhoneVerified: boolean (default: false)
  isVerified: boolean (default: false)
  profilePicture
  dateOfBirth
  licenseNumber (unique, sparse)
  licenseExpiry
  aadharNumber, panNumber
  vehicle: DriverVehicle
  location: DriverLocation
  currentLocation: [number, number] (2dsphere indexed)
  bankDetails: DriverBankDetails
  lastLogin: Date
  otp, otpExpiry (for phone-based auth)
  refreshToken
}
```

**Indexes:**
- phoneNumber, email, licenseNumber: via unique
- vehicle.registrationNumber: via unique in nested schema
- status: 1
- vehicle.type: 1
- createdAt: -1

---

### 1.2 CURRENT USERS SCHEMA

#### Version 1: `/src/modules/database/schemas/user.schema.ts` (Legacy)
**Path:** `/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2/src/modules/database/schemas/user.schema.ts`

```typescript
// Key Fields:
- phoneNumber (unique, required)
- countryCode (default: '+91')
- firstName, lastName (required)
- email (optional)
- userType: enum ['student', 'regular'] (default: 'regular')
- isActive: boolean (default: true)
- isVerified: boolean (default: false)
- isPhoneVerified: boolean (default: true)
- address { displayAddress, street, city, state, country, zipCode, coordinates: GeoJSON }
- savedLocations: Array<{ name, address, coordinates }>
- currentLocation: GeoJSON Point
- fcmTokens: string[]
- dateOfBirth
- totalRides: number (default: 0)
- averageRating: number (default: 5.0)
- totalRatings: number (default: 0)
- walletBalance: number (default: 0)
```

**Indexes:**
- phoneNumber: 1
- email: 1
- userType: 1
- currentLocation.coordinates: 2dsphere

---

#### Version 2: `/src/modules/user/schemas/user.schema.ts` (Modern)
**Path:** `/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2/src/modules/user/schemas/user.schema.ts`

```typescript
@Schema class UserAddress {
  displayAddress, street, city, state, country, zipCode
  coordinates: [number, number] (2dsphere indexed)
}

@Schema class UserSavedLocation {
  name, address
  coordinates: [number, number] (2dsphere indexed)
}

@Schema class UserStats {
  rating: number (default: 5.0)
  totalRides: number (default: 0)
  totalSpent: number (default: 0)
}

@Schema class User {
  phoneNumber (unique, required)
  firstName, lastName (defaults: "")
  countryCode (default: "+91")
  email (optional)
  password (optional)
  role: UserRole (only 'user')
  isActive: boolean (default: true)
  isVerified: boolean (default: false)
  profilePicture
  dateOfBirth
  address: UserAddress
  savedLocations: UserSavedLocation[]
  stats: UserStats
  fcmTokens: string[]
  lastLogin: Date
  refreshToken
  otp, otpExpiry (for phone-based auth)
  isPhoneVerified: boolean (default: false)
  currentLocation: [number, number] (2dsphere indexed)
}
```

**Indexes:**
- phoneNumber: unique
- email: sparse
- role: 1
- isActive: 1
- createdAt: -1

---

### 1.3 BOOKING SCHEMA

#### `/src/modules/booking/schemas/booking.schema.ts` (Modern)
```typescript
@Schema class Booking {
  userId: ObjectId (ref: 'User') - required
  driverId: ObjectId (ref: 'Driver') - optional (matched later)
  bookingLocation: CoordinatesDto
  bookingDestination: CoordinatesDto
  status: BookingStatus enum ['pending', 'accepted', 'driver_arrived', 'ride_started', 'ride_completed', 'cancelled', 'timeout']
  vehicleType: VehicleType (BIKE, AUTO, CAB)
  pickupLocation: BookingLocation { address, coordinates[lng,lat] }
  dropLocation: BookingLocation { address, coordinates[lng,lat] }
  estimatedDistance, estimatedDuration, estimatedFare
  actualDistance, actualDuration, actualFare
  paymentMethod: enum ['cash', 'card', 'upi', 'wallet']
  paymentId, fareBreakdown, scheduledTime
  requestedAt, acceptedAt, arrivedAt, startedAt, completedAt, cancelledAt
  cancelledBy: string ('user' | 'driver' | 'system')
  cancellationReason
  rejectedDrivers: ObjectId[]
  promoCode, otp
  timestamps: true
}
```

**Compound Indexes:**
- userId: 1, status: 1
- driverId: 1, status: 1
- requestedAt: -1, createdAt: -1

---

## 2. AUTHENTICATION & AUTHORIZATION FLOW

### 2.1 USERS AUTHENTICATION

**Controllers & Routes:**
1. **Registration Controller:** `/auth/users/register` (POST)
   - Endpoint: `/users/register`
   - DTO: `RegisterUserDto` { phoneNumber (with country code), firstName, lastName }
   - Service: `AuthService.registerUser()`

2. **Auth Controller:** `/auth/login-otp` (POST)
   - Endpoint: `/auth/verify-otp`
   - DTO: `VerifyOtpDto` { phoneNumber, otp }
   - Service: `AuthService.verifyOtp()`

3. **Refresh Token:** `/auth/refresh` (POST)
   - Uses: `JwtRefreshGuard`
   - Service: `AuthService.buildRefreshResponse()`

4. **Get Current User:** `/auth/me` (GET)
   - Uses: `JwtAuthGuard`

5. **Logout:** `/auth/logout` (POST)
   - Uses: `JwtAuthGuard`

6. **User Profile:** `/users/update-user` (PATCH)
   - Uses: `JwtAuthGuard`
   - DTO: `UpdateUserDto`

**OTP Strategy (Users):**
- OTP stored in Redis with country code stripped
- Phone number stored as: `9876543210` (without +91)
- OTP verification uses Redis primary, MongoDB fallback
- OTP expiry: Typically 10 minutes

**Token Strategy (Users):**
```typescript
// Access Token Payload:
{
  sub: userId,
  role: 'user',
  phoneNumber: '9876543210',
  countryCode: '+91'
}
// Expires: From config (typically 1 hour)

// Refresh Token Payload:
{
  sub: userId,
  tokenId: UUID
}
// Expires: From config (typically 7 days)
```

---

### 2.2 DRIVERS AUTHENTICATION

**Controllers & Routes:**
1. **Driver Auth Register:** `/driver/auth/register` (POST)
   - DTO: `RegisterDriverDto` { countryCode, phoneNumber (without code), firstName, lastName, language }
   - Service: `DriverAuthService.registerDriver()`

2. **Driver Auth Verify OTP:** `/driver/auth/verify-otp` (POST)
   - DTO: `VerifyDriverOtpDto` { countryCode, phoneNumber, otp }
   - Service: `DriverAuthService.verifyOtp()`

3. **Driver Refresh Token:** `/driver/auth/refresh` (POST)
   - Uses: `JwtRefreshGuard`
   - Service: `DriverAuthService.buildRefreshResponse()`

4. **Driver Status Update:** `/drivers/status` (PATCH)
   - DTO: `DriverStatusDto` { status: 'online' | 'offline' }
   - Service: `DriverService.setOnline()` / `setOffline()`

5. **Driver Location Update:** `/drivers/location` (POST)
   - DTO: `UpdateLocationDto` { latitude, longitude, heading, speed }
   - Service: `DriverLocationService.updateLocation()`

6. **Find Nearby Drivers:** `/drivers/nearby` (GET)
   - Query: `NearbyDriversDto` { latitude, longitude, radiusKm, limit, vehicleType }
   - Service: `DriverLocationService.findNearbyDrivers()`

7. **Driver Profile:** `/drivers/me` (GET)
   - Uses: `JwtAuthGuard`
   - Service: Combines MongoDB data + Redis real-time location

**OTP Strategy (Drivers):**
- OTP stored in Redis with `driver:` prefix
- Phone number stored as: `9876543210` (without country code)
- OTP key format: `driver:9876543210`
- OTP verification uses Redis primary, MongoDB fallback

**Token Strategy (Drivers):**
```typescript
// Access Token Payload:
{
  sub: driverId,
  role: 'driver',
  phoneNumber: '9876543210',
  countryCode: '+91'
}
// Expires: From config (typically 1 hour)

// Refresh Token Payload:
{
  sub: driverId,
  tokenId: UUID,
  role: 'driver'
}
// Expires: From config (typically 7 days)
```

---

## 3. SERVICES & BUSINESS LOGIC

### 3.1 USER SERVICES

**Location:** `/src/modules/user/user.service.ts`

```typescript
// Query Methods
findUserByPhoneNumber(phoneNumber: string): Promise<UserDocument | null>
findUserById(userId: string): Promise<UserDocument | null>

// Creation & Update
createNewUser(userData): Promise<UserDocument>
updateExistingUser(user, updateData): Promise<UserDocument>
updateUserOtp(phoneNumber, otp, otpExpiry): Promise<UserDocument>
markUserAsVerified(phoneNumber): Promise<UserDocument>
clearOtp(phoneNumber): Promise<UserDocument>

// Profile Updates
updateUser(userId, dto: UpdateUserDto): Promise<UserDocument>
  // Handles: firstName, lastName, email, profilePicture, dateOfBirth
  // Handles: currentLocation (auto-geocodes to address)
  // Handles: address (manual)
  // Handles: savedLocations
```

---

### 3.2 DRIVER SERVICES

**Location:** `/src/modules/driver/driver.service.ts`

```typescript
// Query Methods
findById(driverId: string): Promise<DriverDocument | null>
findByPhoneNumber(phoneNumber: string): Promise<DriverDocument | null>
findByEmail(email: string): Promise<DriverDocument | null>

// Creation & Update
createNewDriver(data: CreateDriverData): Promise<DriverDocument>
updateDriverOtp(phoneNumber, otp, otpExpiry): Promise<DriverDocument>
updateExistingDriver(driver, data): Promise<DriverDocument>
markDriverAsVerified(phoneNumber): Promise<DriverDocument>
clearDriverOtp(phoneNumber): Promise<DriverDocument>
updateLastLogin(driverId: string): Promise<void>

// Status Management
setOnline(driverId): Promise<DriverDocument>
  // Emits DRIVER_ONLINE event via Kafka
setOffline(driverId): Promise<DriverDocument>
  // Emits DRIVER_OFFLINE event via Kafka

// Location
updateLocationInMongo(driverId, longitude, latitude, heading, speed): Promise<void>
```

---

### 3.3 AUTH SERVICES

#### User Auth Service
**Location:** `/src/modules/auth/auth.service.ts`

```typescript
// Registration & OTP
registerUser(dto): Promise<RegisterResponseDto>
  // Creates new user or updates existing
  // Generates OTP
  // Stores in Redis (primary) and MongoDB (fallback)
  // Sends SMS via OTP service

verifyOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto>
  // Verifies against Redis first, then DB
  // Clears OTP from both stores
  // Marks user as verified

resendOtp(dto: ResendOtpDto): Promise<ResendOtpResponseDto>
  // Rate limits: configurable cooldown
  // Regenerates and sends OTP

// Token Generation
signAccessToken(user: UserDocument): string
signRefreshToken(user: UserDocument): string
buildAuthResponse(user): { accessToken, refreshToken, tokenType, expiresIn, user }
buildRefreshResponse(user): { accessToken, refreshToken, tokenType, expiresIn }
```

#### Driver Auth Service
**Location:** `/src/modules/driver/driver-auth.service.ts`

```typescript
// Identical pattern to User Auth Service but for Drivers

registerDriver(dto): Promise<RegisterDriverResponseDto>
verifyOtp(dto: VerifyDriverOtpDto): Promise<VerifyDriverOtpResponseDto>
resendOtp(dto: ResendDriverOtpDto): Promise<ResendDriverOtpResponseDto>

signAccessToken(driver: DriverDocument): string
signRefreshToken(driver: DriverDocument): string
buildAuthResponse(driver): { accessToken, refreshToken, tokenType, expiresIn, driver }
buildRefreshResponse(driver): { accessToken, refreshToken, tokenType, expiresIn }
```

---

### 3.4 OTP SERVICE (Shared)

**Location:** `/src/modules/auth/services/otp.service.ts`

```typescript
generateOtp(): string  // Returns 6-digit OTP
storeOtp(key: string, otp: string): Promise<Date>  // Stores in Redis, returns expiry
verifyOtp(key, otp, dbOtp?, dbExpiry?): Promise<{valid, source, message}>
  // Verifies against Redis first, falls back to DB
  // Returns: { valid: true/false, source: 'redis'|'db', message }
clearOtp(key: string): Promise<void>  // Clears from both Redis and DB
getRemainingCooldown(key: string): Promise<number | null>  // Rate limiting
sendOtp(phoneNumber: string, otp: string): Promise<boolean>  // SMS delivery
```

---

## 4. CONTROLLERS & API ROUTES

### 4.1 USER ROUTES

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/users/register` | POST | No | Register new user |
| `/users/verify-otp` | POST | No | Verify OTP |
| `/users/resend-otp` | POST | No | Resend OTP |
| `/auth/login-otp` | POST | No | Login with OTP |
| `/auth/refresh` | POST | JWT Refresh | Get new access token |
| `/auth/me` | GET | JWT | Get current user |
| `/auth/logout` | POST | JWT | Logout |
| `/users/user-data` | GET | JWT | Get user profile |
| `/users/update-user` | PATCH | JWT | Update profile |

---

### 4.2 DRIVER ROUTES

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/driver/auth/register` | POST | No | Register new driver |
| `/driver/auth/verify-otp` | POST | No | Verify OTP |
| `/driver/auth/resend-otp` | POST | No | Resend OTP |
| `/driver/auth/refresh` | POST | JWT Refresh | Get new tokens |
| `/drivers/location` | POST | JWT | Update location (real-time) |
| `/drivers/status` | PATCH | JWT | Update online/offline status |
| `/drivers/nearby` | GET | No | Find nearby drivers |
| `/drivers/me` | GET | JWT | Get driver profile |
| `/drivers/online-count` | GET | No | Count online drivers |
| `/api/v1/drivers/complete-registration` | POST | No | Complete registration (Phase 1) |
| `/api/v1/drivers/profile/:driverId` | GET | No | Get driver profile |
| `/api/v1/drivers/online` | POST | No | Go online |
| `/api/v1/drivers/offline` | POST | No | Go offline |
| `/api/v1/drivers/location` | POST | No | Update location |
| `/api/v1/drivers/documents/upload` | POST | No | Upload documents |
| `/api/v1/drivers/:driverId/location` | GET | No | Get current location |

---

## 5. MODULES & DEPENDENCY INJECTION

### 5.1 USER MODULE

**Location:** `/src/modules/user/user.module.ts`

```typescript
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [
    UserService,
    MongooseModule, // Re-export for other modules
  ],
})
export class UserModule {}
```

---

### 5.2 DRIVER MODULE

**Location:** `/src/modules/driver/driver.module.ts`

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    JwtModule.registerAsync({...}),
    forwardRef(() => AuthModule), // For OtpService access
    ConfigModule,
  ],
  providers: [DriverService, DriverLocationService, DriverAuthService],
  controllers: [DriverController, DriverAuthController],
  exports: [DriverService, DriverLocationService, DriverAuthService],
})
export class DriverModule {}
```

---

### 5.3 DRIVERS MODULE (PHASE 1)

**Location:** `/src/modules/drivers/drivers.module.ts`

```typescript
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    LocationModule, // For RedisLocationService, GeofenceService
    DriverModule, // For DriverService to update MongoDB status
  ],
  providers: [DriverOnboardingService],
  controllers: [DriversController],
  exports: [
    DriverOnboardingService,
    MongooseModule,
  ],
})
export class DriversModule {}
```

---

### 5.4 AUTH MODULE

**Location:** `/src/modules/auth/auth.module.ts`

```typescript
@Module({
  imports: [
    JwtModule.registerAsync({...}),
    ConfigModule,
    UserModule, // For UserService
    forwardRef(() => DriverModule), // Circular dep
  ],
  providers: [
    AuthService,
    OtpService,
    OtpStorageService,
  ],
  controllers: [AuthController, RegistrationController],
  exports: [AuthService, OtpService, OtpStorageService],
})
export class AuthModule {}
```

---

### 5.5 MAIN APP MODULE

**Location:** `/src/app.module.ts`

```typescript
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({...}),
    
    // Infrastructure
    DatabaseModule,
    RedisModule,
    KafkaModule,
    WebSocketModule,
    HttpModule,
    
    // Framework
    EventEmitterModule.forRoot({...}),
    ThrottlerModule.forRootAsync({...}),
    ScheduleModule.forRoot(),
    
    // Features
    AuthModule,
    UserModule,
    DriverModule,
    BookingModule,
    PaymentsModule,
    LocationModule,
    
    // Phase 1
    BookingsModule,
    DriversModule,
    RidersModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {...}
```

---

## 6. DTOs (Data Transfer Objects)

### 6.1 USER DTOs

**Register User:**
```typescript
RegisterUserDto {
  phoneNumber: string (with country code, +919876543210)
  firstName?: string
  lastName?: string
}
```

**Verify OTP:**
```typescript
VerifyOtpDto {
  phoneNumber: string (with country code)
  otp: string (6 digits)
}
```

**Update User:**
```typescript
UpdateUserDto {
  firstName?: string
  lastName?: string
  email?: string
  profilePicture?: string
  dateOfBirth?: Date
  currentLocation?: { latitude, longitude }
  address?: { street, city, state, country, zipCode }
  savedLocations?: Array<{ name, address, coordinates }>
}
```

---

### 6.2 DRIVER DTOs

**Register Driver:**
```typescript
RegisterDriverDto {
  countryCode: string (e.g., '+91')
  phoneNumber: string (without code, '9876543210')
  firstName: string
  lastName: string
  language?: 'en' | 'hi'
}
```

**Verify Driver OTP:**
```typescript
VerifyDriverOtpDto {
  countryCode: string
  phoneNumber: string (without code)
  otp: string (6 digits)
}
```

**Update Driver Location:**
```typescript
UpdateLocationDto {
  latitude: number
  longitude: number
  heading?: number
  speed?: number
}
```

**Driver Status:**
```typescript
DriverStatusDto {
  status: 'online' | 'offline'
}
```

**Complete Registration (Phase 1):**
```typescript
CompleteRegistrationDto {
  phoneNumber: string (10 digits)
  firstName: string
  lastName: string
  vehicleNumber: string (e.g., 'UP16AB1234')
  vehicleModel: string
  drivingLicense: string
  aadhaarLast4?: string (4 digits)
  bankAccount: {
    accountNumber: string
    ifsc: string
    accountHolder: string
  }
}
```

---

## 7. ENUMS & CONSTANTS

### 7.1 Enums

```typescript
// User Role
enum UserRole {
  USER = 'user'
}

// User Status
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

// Booking Status
enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DRIVER_ARRIVED = 'driver_arrived',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// Vehicle Type
enum VehicleType {
  BIKE = 'bike',
  AUTO = 'auto',
  CAB = 'cab',
}

// Driver Status
enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
}

// Payment Status
enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Payment Method
enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  WALLET = 'wallet',
}
```

---

## 8. GUARDS & MIDDLEWARE

### 8.1 JWT Auth Guard
**Location:** `/src/modules/auth/guards/jwt-auth.guard.ts`
- Validates JWT access tokens
- Extracts user payload
- Used on protected endpoints

### 8.2 JWT Refresh Guard
**Location:** `/src/modules/auth/guards/jwt-refresh.guard.ts`
- Validates refresh tokens
- Used on `/auth/refresh` endpoints

### 8.3 JWT Auth Middleware
**Location:** `/src/modules/auth/middlewares/jwt-auth.middleware.ts`
- Optional JWT validation
- Applied globally in AppModule

### 8.4 Request ID Middleware
**Location:** `/src/common/middlewares/request-id.middleware.ts`
- Adds unique request ID to each request
- Applied globally for tracing

---

## 9. INFRASTRUCTURE SERVICES

### 9.1 Redis Services
**Location:** `/src/shared/redis/redis.service.ts`

Used for:
- **OTP Storage** (primary)
- **Driver Location Tracking** (real-time geospatial)
- **Session Management**
- **Rate Limiting**

### 9.2 Kafka Services
**Location:** `/src/shared/kafka/`

Events Published:
- `DRIVER_ONLINE` - When driver comes online
- `DRIVER_OFFLINE` - When driver goes offline
- Booking events (TBD)

### 9.3 Database Module
**Location:** `/src/shared/database/`

- MongoDB/Mongoose configuration
- Connection setup
- Schema registration

---

## 10. CURRENT STRUCTURE ISSUES & DUPLICATION

### 10.1 Major Duplications

| Component | User | Driver | Impact |
|-----------|------|--------|--------|
| Schema | 2 versions | 2 versions | Code maintenance nightmare |
| Auth Service | AuthService | DriverAuthService | Identical logic duplicated |
| Auth Controller | RegistrationController, AuthController | DriverAuthController | Duplicated endpoints |
| OTP Flow | In AuthService | In DriverAuthService | Same logic, different code |
| Location Service | Minimal | DriverLocationService (Redis) | Only driver has tracking |
| Phone Verification | isPhoneVerified | isPhoneVerified | Same field, separate code |
| Verification Status | Limited | Detailed (APPROVED_PENDING_DOCS, etc.) | Inconsistent states |

### 10.2 Inconsistencies

1. **Phone Number Storage:**
   - Users: Some with country code in input, stripped for DB
   - Drivers: Always stored without country code

2. **Verification State:**
   - Users: Simple isVerified boolean
   - Drivers: Detailed verificationStatus enum

3. **Stats Tracking:**
   - Users: totalRides, averageRating, totalRatings, walletBalance
   - Drivers: Same fields PLUS totalEarnings, canGoOnline, serviceArea

4. **Status Field:**
   - Users: No status field (implied via isActive)
   - Drivers: status enum (offline, online, busy)

5. **Location Tracking:**
   - Users: currentLocation in schema, no real-time updates
   - Drivers: Both MongoDB + Redis for real-time tracking

---

## 11. CONSOLIDATION ROADMAP

### 11.1 Recommended Unified Schema

```typescript
@Schema({
  timestamps: true,
  collection: 'users', // Single collection
  discriminatorKey: 'type'
})
export class User {
  // Universal Fields
  phoneNumber: string (unique, required)
  countryCode: string (default: '+91')
  firstName, lastName: string
  email: string (unique, sparse)
  password: string (optional)
  
  // Type Discriminator
  type: enum ['user', 'driver'] // NEW
  status: enum ['active', 'inactive', 'blocked', 'offline', 'online', 'busy'] // UNIFIED
  
  // Universal Verification
  isPhoneVerified: boolean (default: false)
  isVerified: boolean (default: false) // Driver full verification
  profilePicture: string (optional)
  dateOfBirth: Date (optional)
  
  // Universal Authentication
  otp: string (optional)
  otpExpiry: Date (optional)
  refreshToken: string (optional)
  lastLogin: Date (optional)
  
  // Universal Location
  currentLocation: [number, number] (2dsphere indexed)
  address: Address (nested)
  savedLocations: SavedLocation[] (nested)
  
  // Universal Stats
  totalRides: number (default: 0)
  averageRating: number (default: 5.0)
  totalRatings: number (default: 0)
  
  // User-specific fields (optional)
  userType?: enum ['student', 'regular'] // Only for type: 'user'
  walletBalance?: number
  savedLocations?: SavedLocation[]
  fcmTokens?: string[]
  
  // Driver-specific fields (optional)
  language?: enum ['en', 'hi'] // Only for type: 'driver'
  vehicle?: DriverVehicle // Only for drivers
  bankDetails?: DriverBankDetails // Only for drivers
  licenseNumber?: string (unique, sparse) // Only for drivers
  documents?: DriverDocuments // Only for drivers
  verificationStatus?: enum ['APPROVED_PENDING_DOCS', 'DOCS_UPLOADED', 'VERIFIED', 'REJECTED'] // Only for drivers
  canGoOnline?: boolean // Only for drivers
  serviceArea?: GeoJSON // Only for drivers
}
```

### 11.2 Unified Services Pattern

```
src/modules/user/
├── schemas/
│   └── user.schema.ts (unified)
├── services/
│   ├── user.service.ts (handles both user & driver)
│   ├── auth.service.ts (unified auth)
│   └── location.service.ts (unified location)
├── controllers/
│   ├── auth.controller.ts (handles both routes)
│   ├── user.controller.ts (user-specific)
│   └── driver.controller.ts (driver-specific)
├── dto/
│   ├── register.dto.ts (unified)
│   ├── user-register.dto.ts (user-specific)
│   └── driver-register.dto.ts (driver-specific)
└── user.module.ts (unified)
```

### 11.3 Migration Strategy

1. **Phase 1:** Create unified schema with type discriminator
2. **Phase 2:** Create unified services wrapping both types
3. **Phase 3:** Migrate endpoints to use type parameter
4. **Phase 4:** Deprecate old driver-specific endpoints
5. **Phase 5:** Data migration and cleanup

---

## 12. FILE LOCATIONS SUMMARY

### Schema Files
- `/src/modules/database/schemas/driver.schema.ts` (Legacy Driver)
- `/src/modules/driver/schemas/driver.schema.ts` (Modern Driver)
- `/src/modules/database/schemas/user.schema.ts` (Legacy User)
- `/src/modules/user/schemas/user.schema.ts` (Modern User)
- `/src/modules/booking/schemas/booking.schema.ts` (Modern Booking)
- `/src/modules/database/schemas/booking.schema.ts` (Legacy Booking)

### Service Files
- `/src/modules/auth/auth.service.ts` (User Auth)
- `/src/modules/auth/services/otp.service.ts` (Shared OTP)
- `/src/modules/driver/driver-auth.service.ts` (Driver Auth)
- `/src/modules/driver/driver.service.ts` (Driver Business Logic)
- `/src/modules/user/user.service.ts` (User Business Logic)
- `/src/modules/driver/driver-location.service.ts` (Driver Location)

### Controller Files
- `/src/modules/auth/auth.controller.ts` (User Auth Routes)
- `/src/modules/auth/registration.controller.ts` (User Registration)
- `/src/modules/driver/driver-auth.controller.ts` (Driver Auth Routes)
- `/src/modules/driver/driver.controller.ts` (Driver Business Routes)
- `/src/modules/user/user.controller.ts` (User Profile Routes)
- `/src/modules/drivers/drivers.controller.ts` (Phase 1 Driver Routes)

### Module Files
- `/src/modules/auth/auth.module.ts`
- `/src/modules/user/user.module.ts`
- `/src/modules/driver/driver.module.ts`
- `/src/modules/drivers/drivers.module.ts`
- `/src/app.module.ts` (Root Module)

### DTO Files
- `/src/modules/user/dto/register-user.dto.ts`
- `/src/modules/user/dto/update-user.dto.ts`
- `/src/modules/user/dto/user-response.dto.ts`
- `/src/modules/driver/dto/driver-auth.dto.ts`
- `/src/modules/driver/dto/driver.dto.ts`
- `/src/modules/drivers/dto/complete-registration.dto.ts`

### Utility Files
- `/src/common/enums/index.ts` (All Enums)
- `/src/common/config/app.config.ts` (Configuration)
- `/src/common/constants/error-codes.ts` (Error Codes)

---

## 13. CONFIGURATION & ENVIRONMENT

**Location:** `.env` / `.env.example`

Key Settings:
- `APP_PORT`: Server port
- `MONGODB_URI`: Database connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `JWT_SECRET`: Token signing secret
- `JWT_EXPIRES_IN`: Access token expiry (e.g., 1h)
- `JWT_REFRESH_SECRET`: Refresh token secret
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiry (e.g., 7d)
- `SMS_PROVIDER_KEY`: For OTP delivery
- `OTP_EXPIRY`: OTP validity (e.g., 10 minutes)
- `OTP_COOLDOWN`: Rate limiting between OTP requests
- `KAFKA_BROKERS`: Message broker addresses

---

## 14. NEXT STEPS FOR CONSOLIDATION

1. **Audit Dependencies:** Identify all code referencing separate driver/user schemas
2. **Create Migration Script:** Copy/backup existing data
3. **Build Unified Schema:** Implement discriminator-based schema
4. **Update Services:** Create unified service layer
5. **Update Controllers:** Merge endpoints with type parameter
6. **Update Guards:** Ensure role-based access still works
7. **Update Tests:** Adapt test cases for new structure
8. **Deploy:** Gradual rollout with feature flags
9. **Cleanup:** Remove deprecated code

---

## 15. BENEFITS OF CONSOLIDATION

- **50% Code Reduction:** Eliminate duplicate auth, OTP, verification logic
- **Unified Data Model:** Single source of truth
- **Simplified Maintenance:** One schema, one service, one controller logic
- **Better Type Safety:** Shared interfaces and types
- **Easier Feature Addition:** Add features to both types simultaneously
- **Reduced Bugs:** Less code = fewer bugs
- **Better Testability:** Single test suite for both types
- **Improved Performance:** Single collection queries vs. multiple

---

This report provides complete visibility into the current driver/user duplication and a clear path forward for consolidation.
