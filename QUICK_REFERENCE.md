# Hanumanji2 - Quick Reference Guide

## Key Findings at a Glance

### Schema Duplication
- **4 Schema files** (2 User + 2 Driver versions)
- **2 separate collections** (`users`, `drivers`)
- **90% identical structure** across both types

### Authentication Duplication
- **2 Auth Services** (AuthService for Users, DriverAuthService for Drivers)
- **3 Controllers** (RegistrationController, AuthController, DriverAuthController)
- **Identical OTP flow** implemented separately
- **Identical JWT token logic** implemented separately

### File Breakdown

```
DRIVER-SPECIFIC FILES:
/src/modules/driver/driver.service.ts
/src/modules/driver/driver-auth.service.ts
/src/modules/driver/driver-location.service.ts
/src/modules/driver/driver.controller.ts
/src/modules/driver/driver-auth.controller.ts
/src/modules/driver/schemas/driver.schema.ts
/src/modules/driver/dto/driver-auth.dto.ts
/src/modules/driver/dto/driver.dto.ts
/src/modules/drivers/drivers.controller.ts
/src/modules/drivers/drivers.module.ts
/src/modules/drivers/services/driver-onboarding.service.ts
/src/modules/drivers/dto/complete-registration.dto.ts

USER-SPECIFIC FILES:
/src/modules/user/user.service.ts
/src/modules/user/user.controller.ts
/src/modules/user/schemas/user.schema.ts
/src/modules/user/dto/register-user.dto.ts
/src/modules/user/dto/update-user.dto.ts
/src/modules/auth/auth.service.ts
/src/modules/auth/auth.controller.ts
/src/modules/auth/registration.controller.ts

LEGACY/DATABASE SCHEMAS:
/src/modules/database/schemas/driver.schema.ts
/src/modules/database/schemas/user.schema.ts
```

---

## Authentication Endpoints Comparison

### USER AUTHENTICATION
```
POST /users/register
  DTO: { phoneNumber: "+919876543210", firstName?, lastName? }
  
POST /users/verify-otp
  DTO: { phoneNumber: "+919876543210", otp: "123456" }
  
POST /users/resend-otp
  DTO: { phoneNumber: "+919876543210" }

POST /auth/login-otp (same as verify-otp)

POST /auth/refresh
  Uses: JWT Refresh Guard
  
GET /auth/me
  Uses: JWT Access Guard
  
POST /auth/logout
  Uses: JWT Access Guard
```

### DRIVER AUTHENTICATION
```
POST /driver/auth/register
  DTO: { countryCode: "+91", phoneNumber: "9876543210", firstName, lastName, language? }

POST /driver/auth/verify-otp
  DTO: { countryCode: "+91", phoneNumber: "9876543210", otp: "123456" }
  
POST /driver/auth/resend-otp
  DTO: { countryCode: "+91", phoneNumber: "9876543210" }

POST /driver/auth/refresh
  Uses: JWT Refresh Guard

POST /api/v1/drivers/complete-registration
  DTO: { phoneNumber, firstName, lastName, vehicleNumber, vehicleModel, drivingLicense, aadhaarLast4?, bankAccount }
```

---

## Key Differences in Phone Number Handling

### Users
- Input: `+919876543210` (with country code)
- Stored in DB: `9876543210` (country code stripped)
- OTP Redis Key: `9876543210` (no prefix)

### Drivers
- Input: countryCode="+91", phoneNumber="9876543210" (already separated)
- Stored in DB: `9876543210` (without country code)
- OTP Redis Key: `driver:9876543210` (with driver prefix)

---

## Schema Comparison

### Common Fields (Both Have)
- phoneNumber
- firstName, lastName
- email (optional)
- isPhoneVerified
- isVerified
- currentLocation (geospatial)
- totalRides, averageRating, totalRatings
- otp, otpExpiry
- lastLogin, refreshToken

### User-Only Fields
- userType (student, regular)
- walletBalance
- savedLocations
- fcmTokens
- address (complex)
- role: 'user'

### Driver-Only Fields
- vehicleNumber, vehicleModel, drivingLicense
- aadhaarLast4
- bankAccount
- verificationStatus (APPROVED_PENDING_DOCS, etc.)
- canGoOnline
- serviceArea (geospatial)
- documents (license, rc, aadhaar, photo)
- totalEarnings
- language (en, hi)
- status (offline, online, busy)
- vehicle (nested)
- licenseNumber, licenseExpiry
- vehicle.type, vehicle.make, vehicle.model

---

## OTP Service (Shared)

Location: `/src/modules/auth/services/otp.service.ts`

```typescript
generateOtp(): string
storeOtp(key: string, otp: string): Promise<Date>
verifyOtp(key, otp, dbOtp?, dbExpiry?): Promise<{valid, source, message}>
clearOtp(key: string): Promise<void>
getRemainingCooldown(key: string): Promise<number | null>
sendOtp(phoneNumber: string, otp: string): Promise<boolean>
```

**Strategy:**
- Primary: Redis (fast, auto-expiry)
- Fallback: MongoDB (reliability)
- Rate limiting: Configurable cooldown between requests

---

## Booking Schema References

Bookings reference:
- `userId` (ObjectId, ref: 'User')
- `driverId` (ObjectId, ref: 'Driver')

Status: pending → accepted → driver_arrived → ride_started → ride_completed → cancelled

---

## Modules Import Structure

```
AppModule
├── AuthModule
│   ├── UserService
│   ├── OtpService
│   └── RegistrationController
├── UserModule
│   └── UserService
├── DriverModule
│   ├── DriverService
│   ├── DriverLocationService
│   └── DriverAuthService
└── DriversModule (Phase 1)
    ├── DriverOnboardingService
    └── LocationModule
```

---

## Configuration Settings

From `.env`:
- `JWT_EXPIRES_IN`: Access token duration (typically "1h")
- `JWT_REFRESH_EXPIRES_IN`: Refresh token duration (typically "7d")
- `OTP_EXPIRY`: OTP validity period
- `OTP_COOLDOWN`: Rate limiting between requests
- `MONGODB_URI`: Database connection
- `REDIS_HOST`, `REDIS_PORT`: Cache connection

---

## Consolidation Benefits

| Metric | Current | After Consolidation |
|--------|---------|---------------------|
| Schema files | 4 | 1 |
| Auth services | 2 | 1 |
| Controllers | 3 | 1 |
| DTOs | ~6 | ~3 |
| Code duplication | ~40% | ~0% |
| Maintenance effort | High | Low |
| Feature development | 2x effort | 1x effort |

---

## Migration Complexity: Low to Medium

**What DOESN'T need changes:**
- Booking schema (already uses userId)
- Kafka/Redis infrastructure
- JWT strategy
- OTP service

**What NEEDS changes:**
- User & Driver schemas (consolidate to discriminator pattern)
- Auth services (create unified auth service)
- Controllers (merge endpoints)
- DTOs (merge request/response types)
- Module dependencies (simplify imports)

**Estimated effort:** 3-5 days for experienced developer

