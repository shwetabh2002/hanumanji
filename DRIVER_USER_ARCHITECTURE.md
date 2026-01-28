# Driver-User Architecture Documentation

## Overview

Clean separation between **authentication** (User schema) and **driver business logic** (Driver schema).

---

## Schema Architecture

### **User Schema** (`users` collection)
**Purpose:** Authentication & account management for ALL users (riders + drivers)

```typescript
{
  // Identity
  phoneNumber: string,           // Primary identifier
  countryCode: string,           // Default: '+91'
  firstName: string,
  lastName: string,

  // User Type (for login routing)
  type: 'user' | 'driver',       // ← ONLY place where type exists!

  // Authentication
  otp: string,
  otpExpiry: Date,
  isPhoneVerified: boolean,
  refreshToken: string,
  password?: string,

  // Account Status
  role: 'USER' | 'ADMIN',
  isActive: boolean,
  isVerified: boolean,
  lastLogin: Date,

  // Optional
  email?: string,
  profilePicture?: string,
  dateOfBirth?: Date,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Key Points:**
- Used for **login/OTP verification** for both riders and drivers
- JWT token contains `User._id` (not Driver._id)
- `type` field routes user to correct app (rider app vs driver app)

---

### **Driver Schema** (`drivers` collection)
**Purpose:** Driver-specific KYC, vehicle, and business logic

```typescript
{
  // ============ Link to User Account ============
  userId: ObjectId,              // → References User._id (unique)
  phoneNumber: string,           // Duplicated for query convenience (unique)
  countryCode: string,           // Default: '+91'

  // ============ Basic Info (Duplicated for Queries) ============
  firstName: string,
  lastName: string,
  language: 'en' | 'hi',
  profilePicture?: string,
  dateOfBirth?: Date,

  // ============ Driver Status & Approval ============
  status: DriverStatus,          // 'pending_approval' | 'approved' | 'rejected' | 'online' | 'offline' | 'busy'
  isVerified: boolean,           // Full driver verification (documents approved)
  canGoOnline: boolean,          // Can driver go online?

  // ============ KYC Documents ============
  licenseNumber: string,         // Unique
  licenseExpiry: Date,
  aadharNumber: string,          // 12 digits (encrypt in production)
  panNumber: string,             // Format: ABCDE1234F

  // Document Verification Status
  licenseVerificationStatus: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected',
  aadharVerificationStatus: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected',
  panVerificationStatus: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected',
  rcVerificationStatus: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected',

  // ============ Approval Tracking ============
  approvedBy?: string,           // Admin userId who approved
  approvedAt?: Date,
  rejectedBy?: string,           // Admin userId who rejected
  rejectedAt?: Date,
  rejectionReason?: string,

  // ============ Vehicle Details ============
  vehicle: {
    type: 'BIKE' | 'AUTO' | 'CAR',
    make: string,
    model: string,
    year: number,
    color: string,
    registrationNumber: string,  // Unique (e.g., UP16AB1234)
    rcNumber?: string,
    insuranceNumber?: string,
    insuranceExpiry?: Date
  },

  // ============ Bank Details ============
  bankDetails: {
    accountNumber: string,
    ifscCode: string,
    holderName: string,
    bankName?: string
  },

  // ============ Location (Real-time & Historical) ============
  currentLocation: [number, number],  // [longitude, latitude] - 2dsphere index
  location: {
    coordinates: [number, number],
    address?: string,
    heading?: number,              // Direction in degrees
    speed?: number,                // Speed in km/h
    accuracy?: number,
    lastUpdated: Date
  },

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Key Points:**
- **NO** `type` field (it's implicitly driver data!)
- **NO** auth fields (otp, password, refreshToken)
- **NO** lastLogin (auth concern)
- Contains ONLY driver-specific business data

---

## Data Flow

### 1. **Registration Flow**

```
Step 1: User Registration (Phone + OTP)
POST /api/v1/users/register
Body: { phoneNumber, countryCode, firstName, lastName, type: 'driver' }
→ Creates User record with type='driver'
→ Returns JWT with User._id

Step 2: OTP Verification
POST /api/v1/users/verify-otp
Body: { phoneNumber, countryCode, otp }
→ Verifies OTP
→ Sets isPhoneVerified = true
→ Returns JWT with User._id

Step 3: Complete Driver Registration (KYC)
POST /api/v1/drivers/complete-registration
Headers: { Authorization: Bearer <JWT> }
Body: { licenseNumber, aadharNumber, panNumber, vehicle, bankDetails }
→ Extracts userId from JWT (req.user.sub)
→ Finds User by userId
→ Creates Driver record with userId reference
→ Status: 'pending_approval'
→ canGoOnline: false
```

### 2. **Login Flow**

```
POST /api/v1/users/login
Body: { phoneNumber, countryCode }
→ Finds User by phoneNumber
→ Checks user.type === 'driver'
→ Sends OTP

POST /api/v1/users/verify-otp
→ Returns JWT with User._id
```

### 3. **Get Driver Status**

```
GET /api/v1/drivers/me/status
Headers: { Authorization: Bearer <JWT> }
→ Extracts userId from JWT (req.user.sub)
→ Finds Driver by userId
→ Returns { registered, status, canGoOnline, documentsStatus }
```

### 4. **Go Online/Offline**

```
POST /api/v1/drivers/online
Headers: { Authorization: Bearer <JWT> }
Body: { location: { latitude, longitude } }
→ JWT contains User._id
→ DriverService.findById(userId) - finds Driver by userId
→ Updates Driver.status = 'online'
→ Adds to Redis geospatial index
```

---

## Database Relationships

```
┌─────────────────┐
│  User (users)   │
│                 │
│  _id: ObjectId  │◄──────┐
│  phoneNumber    │       │
│  type: 'driver' │       │ userId (reference)
│  otp, password  │       │
│  refreshToken   │       │
└─────────────────┘       │
                          │
                    ┌─────────────────────┐
                    │ Driver (drivers)    │
                    │                     │
                    │ userId: ObjectId    │
                    │ phoneNumber         │
                    │ status              │
                    │ vehicle             │
                    │ bankDetails         │
                    │ licenseNumber       │
                    │ aadharNumber        │
                    └─────────────────────┘
```

**Linking Strategy:**
- JWT contains `User._id`
- Driver lookups by `userId` field
- `DriverService.findById(id)` tries both:
  1. `Driver._id === id`
  2. `Driver.userId === id`

---

## Key Benefits

✅ **Clean Separation of Concerns**
   - Auth logic isolated in User schema
   - Driver business logic isolated in Driver schema

✅ **Reusable Auth System**
   - Same User schema handles riders and drivers
   - Just change `type` field

✅ **Security**
   - Sensitive auth data (OTP, password) not in Driver table
   - Easy to encrypt/secure User table separately

✅ **Query Performance**
   - Driver queries don't fetch unnecessary auth fields
   - Indexes optimized per collection

✅ **Scalability**
   - Can add Rider schema similarly
   - Can add Admin schema similarly
   - All link to User via userId

---

## Service Layer

### **DriverService** (`driver.service.ts`)

**Dual Responsibilities:**

1. **Auth Operations** (uses User model)
   - `createNewDriver()` - creates User with type='driver'
   - `markDriverAsVerified()` - marks User.isPhoneVerified = true
   - `updateDriverOtp()` - updates User.otp

2. **Driver Operations** (uses Driver model)
   - `findById(id)` - finds by Driver._id or userId
   - `setOnline(id)` - updates Driver.status
   - `setOffline(id)` - updates Driver.status
   - `updateProfile(id)` - updates Driver fields
   - `updateLocationInMongo(id)` - updates Driver.location

**Smart ID Lookup:**
```typescript
async findById(id: string): Promise<DriverDocument | null> {
  // Try Driver._id first
  let driver = await this.driverModel.findById(id).exec();

  // If not found, try userId
  if (!driver) {
    driver = await this.driverModel.findOne({ userId: id }).exec();
  }

  return driver;
}
```

### **DriverOnboardingService** (`driver-onboarding.service.ts`)

**Responsibilities:**
- `completeRegistration(dto, userId)` - creates Driver record
- `getDriverProfile(driverId)` - gets Driver details
- `getDriverStatusByUserId(userId)` - gets status by userId
- `approveDriver(driverId, adminId)` - admin approval
- `rejectDriver(driverId, adminId, reason)` - admin rejection

---

## Frontend (LakshmanApp) Changes Needed

### Update API Types
```typescript
export interface Driver {
  id: string;
  userId: string;              // ← Add this
  phoneNumber: string;
  firstName: string;
  lastName: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'online' | 'offline' | 'busy';
  canGoOnline: boolean;
  vehicle?: { ... };
  // ... no email, no password, no otp fields
}
```

### Storage
```typescript
// After login, store both User and Driver info
const user = response.user;        // User info (for auth)
const driver = response.driver;    // Driver info (if registered)

await secureStorage.setDriverData({
  userId: user.id,                 // User._id
  driverId: driver?.id,            // Driver._id (if exists)
  phoneNumber: user.phoneNumber,
  isPhoneVerified: user.isPhoneVerified,
  // ... other fields
});
```

---

## Migration Notes

If you have existing data:

1. **Create Driver records from User records where type='driver':**
   ```javascript
   const drivers = await User.find({ type: 'driver' });

   for (const user of drivers) {
     await Driver.create({
       userId: user._id,
       phoneNumber: user.phoneNumber,
       countryCode: user.countryCode,
       firstName: user.firstName,
       lastName: user.lastName,
       status: user.status || 'pending_approval',
       // ... migrate other fields
     });
   }
   ```

2. **Update Redis keys** to use Driver._id instead of User._id

---

## Environment Setup

### Start Backend
```bash
cd hanumanji2
npm run start:dev
```

### Test Flow
1. Register driver (creates User)
2. Verify OTP (gets JWT with User._id)
3. Complete registration (creates Driver with userId)
4. Check status (looks up Driver by userId)
5. Go online (updates Driver status)

---

## Testing Checklist

- [ ] User registration creates User record with type='driver'
- [ ] OTP verification returns JWT with User._id
- [ ] Complete registration creates Driver record with userId
- [ ] Driver status endpoint returns correct status
- [ ] Go online works with JWT containing User._id
- [ ] Go offline works with JWT containing User._id
- [ ] Location updates work
- [ ] Admin approval updates Driver.status
- [ ] Frontend can fetch driver profile

---

## Questions?

**Q: Why duplicate phoneNumber, firstName, lastName in Driver table?**
A: For query convenience. We can query drivers without joining User table.

**Q: Can a User be both rider and driver?**
A: Not currently. `type` is either 'user' or 'driver'. To support both, we'd need:
   - User.type = ['user', 'driver']
   - Or separate Rider table similar to Driver table

**Q: How do we handle driver going online?**
A: JWT contains User._id → DriverService.findById() looks up by userId → updates Driver.status

**Q: Where should we add driver stats (total rides, earnings)?**
A: In Driver schema (driver-specific metrics) or a separate DriverStats table.

---

**Last Updated:** January 21, 2026
**Architecture Version:** 2.0 (Clean Separation)
