# Fields to Update - Complete Checklist

## 🎯 Quick Summary

**Backend:** ✅ Already updated (Driver schema cleaned)
**Frontend:** ⚠️ Needs updates (API types and interfaces)

---

## 📱 Frontend Updates Required (LakshmanApp)

### 1. **Update Driver Interface**
`sitaRam/LakshmanApp/src/types/api.types.ts`

**Current (INCORRECT):**
```typescript
export interface Driver {
  id: string;
  phoneNumber: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  email?: string;                    // ❌ REMOVE - auth only
  isPhoneVerified: boolean;          // ❌ REMOVE - auth only
  isVerified: boolean;               // ✅ KEEP - driver verification
  isActive?: boolean;                // ❌ REMOVE - auth only
  status: '...';
  canGoOnline?: boolean;
  // ... rest
}
```

**Should be (CORRECT):**
```typescript
export interface Driver {
  id: string;                        // Driver._id
  userId: string;                    // ✅ ADD - User._id reference
  phoneNumber: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  language?: 'en' | 'hi';
  isVerified: boolean;               // Driver verification (docs approved)
  status: 'pending_approval' | 'documents_pending' | 'approved' | 'rejected' | 'offline' | 'online' | 'busy';
  canGoOnline?: boolean;
  isOnline?: boolean;

  // Vehicle
  vehicle?: {
    type: 'bike' | 'auto' | 'car';
    make: string;
    model: string;
    year: number;
    color: string;
    registrationNumber: string;
  };

  // KYC
  licenseNumber?: string;
  aadharNumber?: string;
  panNumber?: string;

  // Document Verification
  documentsStatus?: {
    license: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected';
    aadhar: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected';
    pan: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected';
    rc: 'not_uploaded' | 'uploaded' | 'verified' | 'rejected';
  };

  // Location
  currentLocation?: [number, number];

  // Approval
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
```

**Fields to REMOVE:**
- ❌ `email` - auth concern (User schema only)
- ❌ `isPhoneVerified` - auth concern (User schema only)
- ❌ `isActive` - auth concern (User schema only)

**Fields to ADD:**
- ✅ `userId` - reference to User._id
- ✅ `language` - driver's preferred language

---

### 2. **Update DriverStatusResponse**
`sitaRam/LakshmanApp/src/types/api.types.ts`

**Current:**
```typescript
export interface DriverStatusResponse {
  registered: boolean;
  driverId?: string;
  status?: string;
  canGoOnline?: boolean;
  isVerified?: boolean;
  documentsStatus?: {...};
  message: string;
  messageHi: string;
}
```

**Should be (ADD userId):**
```typescript
export interface DriverStatusResponse {
  registered: boolean;
  driverId?: string;              // Driver._id
  userId?: string;                // ✅ ADD - User._id
  status?: string;
  canGoOnline?: boolean;
  isVerified?: boolean;
  documentsStatus?: {...};
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  message: string;
  messageHi: string;
}
```

---

### 3. **Update VerifyOtpResponseData**
Currently returns User object as "user", should clarify:

**Current:**
```typescript
export interface VerifyOtpResponseData {
  message: string;
  user: Driver;  // This is actually User type!
  accessToken?: string;
  refreshToken?: string;
}
```

**Should be (CLARIFY):**
```typescript
export interface User {
  id: string;                    // User._id (used in JWT)
  phoneNumber: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  type: 'user' | 'driver';       // For routing
  isPhoneVerified: boolean;
  isActive: boolean;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VerifyOtpResponseData {
  message: string;
  user: User;                    // ✅ User object (not Driver)
  accessToken?: string;
  refreshToken?: string;
}
```

---

## 🔧 Backend Verification (Already Done, But Test These)

### 1. **Driver Schema** ✅
Location: `src/modules/driver/schemas/driver.schema.ts`

**Verify these fields exist:**
- ✅ `userId: ObjectId` (references User._id)
- ✅ `phoneNumber: string`
- ✅ `status: DriverStatus`
- ✅ `isVerified: boolean` (driver verification)
- ✅ `canGoOnline: boolean`

**Verify these fields are REMOVED:**
- ❌ `email` - REMOVED
- ❌ `password` - REMOVED
- ❌ `isPhoneVerified` - REMOVED (auth concern)
- ❌ `otp` - REMOVED
- ❌ `otpExpiry` - REMOVED
- ❌ `refreshToken` - REMOVED
- ❌ `lastLogin` - REMOVED
- ❌ `type` - REMOVED (not needed in Driver schema)

---

### 2. **API Endpoints to Test**

#### **A. Registration Flow**
```bash
# Step 1: Register (creates User)
POST http://localhost:3000/api/v1/users/register
{
  "phoneNumber": "9876543210",
  "countryCode": "+91",
  "firstName": "Test",
  "lastName": "Driver",
  "language": "en",
  "type": "driver"
}
# ✅ Should return: { userId, accessToken, refreshToken }
# ✅ JWT should contain User._id

# Step 2: Verify OTP
POST http://localhost:3000/api/v1/users/verify-otp
{
  "phoneNumber": "9876543210",
  "countryCode": "+91",
  "otp": "123456"
}
# ✅ Should return: { user: {...}, accessToken, refreshToken }
# ✅ user object should have type='driver'

# Step 3: Complete Driver Registration (creates Driver record)
POST http://localhost:3000/api/v1/drivers/complete-registration
Headers: { Authorization: "Bearer <JWT>" }
{
  "phoneNumber": "9876543210",
  "firstName": "Test",
  "lastName": "Driver",
  "licenseNumber": "DL1234567890123",
  "aadharNumber": "123456789012",
  "panNumber": "ABCDE1234F",
  "vehicle": {
    "type": "bike",
    "make": "Honda",
    "model": "Activa",
    "year": 2023,
    "color": "Black",
    "registrationNumber": "UP16AB1234"
  },
  "bankAccount": {
    "accountNumber": "1234567890",
    "ifsc": "SBIN0001234",
    "accountHolder": "Test Driver"
  }
}
# ✅ Should create Driver record with userId = User._id
# ✅ Should return: { success: true, driverId, status: 'pending_approval' }
```

#### **B. Status Check**
```bash
# Get driver status (uses userId from JWT)
GET http://localhost:3000/api/v1/drivers/me/status
Headers: { Authorization: "Bearer <JWT>" }

# ✅ Should lookup Driver by userId
# ✅ Should return: { registered: true, driverId, status, canGoOnline, ... }
```

#### **C. Go Online/Offline**
```bash
# Go Online
POST http://localhost:3000/api/v1/drivers/online
Headers: { Authorization: "Bearer <JWT>" }
{
  "location": {
    "latitude": 28.5355,
    "longitude": 77.3910,
    "heading": 90,
    "speed": 0
  }
}
# ✅ JWT contains User._id
# ✅ DriverService.findById(userId) should find Driver by userId field
# ✅ Should update Driver.status = 'online'

# Go Offline
POST http://localhost:3000/api/v1/drivers/offline
Headers: { Authorization: "Bearer <JWT>" }
# ✅ Should update Driver.status = 'offline'
```

---

## 🗄️ Database Verification

### Collections to Check:

#### **1. Users Collection**
```javascript
db.users.findOne({ phoneNumber: "9876543210" })
```

**Expected fields:**
```json
{
  "_id": ObjectId("..."),         // ← This goes in JWT
  "phoneNumber": "9876543210",
  "countryCode": "+91",
  "firstName": "Test",
  "lastName": "Driver",
  "type": "driver",               // ← For routing
  "isPhoneVerified": true,
  "isActive": true,
  "otp": null,
  "refreshToken": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### **2. Drivers Collection**
```javascript
db.drivers.findOne({ phoneNumber: "9876543210" })
```

**Expected fields:**
```json
{
  "_id": ObjectId("..."),          // Driver._id
  "userId": ObjectId("..."),       // ← References users._id
  "phoneNumber": "9876543210",
  "countryCode": "+91",
  "firstName": "Test",
  "lastName": "Driver",
  "language": "en",

  "status": "pending_approval",
  "isVerified": false,
  "canGoOnline": false,

  "licenseNumber": "DL1234567890123",
  "aadharNumber": "123456789012",
  "panNumber": "ABCDE1234F",

  "vehicle": {
    "type": "BIKE",
    "make": "Honda",
    "model": "Activa",
    "year": 2023,
    "color": "Black",
    "registrationNumber": "UP16AB1234"
  },

  "bankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "holderName": "Test Driver"
  },

  "licenseVerificationStatus": "not_uploaded",
  "aadharVerificationStatus": "not_uploaded",
  "panVerificationStatus": "not_uploaded",
  "rcVerificationStatus": "not_uploaded",

  "currentLocation": [0, 0],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**SHOULD NOT HAVE:**
- ❌ `email`
- ❌ `password`
- ❌ `isPhoneVerified`
- ❌ `otp`
- ❌ `otpExpiry`
- ❌ `refreshToken`
- ❌ `type`

---

## 📝 Frontend Code Changes Needed

### **1. Update secureStorage helper**
`sitaRam/LakshmanApp/src/services/storage/secureStorage.ts`

If you're storing driver data, update to handle userId:

```typescript
interface StoredDriverData {
  userId: string;                    // ✅ ADD - User._id
  driverId?: string;                 // Driver._id (if registered)
  phoneNumber: string;
  firstName: string;
  lastName: string;
  isPhoneVerified: boolean;          // From User
  status?: string;                   // From Driver
  canGoOnline?: boolean;             // From Driver
  // ... other fields
}
```

### **2. Update App.tsx navigation logic**
`sitaRam/LakshmanApp/src/App.tsx`

After OTP verification:
```typescript
const handleVerifySuccess = useCallback(async (user: User) => {
  logger.info('OTP verified, user:', user);

  // user.id is User._id (goes in JWT)
  setIsLoggedIn(true);

  // Check if driver registration exists
  const status = await driverService.getRegistrationStatus();
  // status.userId = User._id
  // status.driverId = Driver._id (if exists)

  if (!status.registered) {
    setCurrentScreen('completeRegistration');
  } else if (status.status === 'pending_approval') {
    setCurrentScreen('approvalWaiting');
  } else if (status.canGoOnline) {
    setCurrentScreen('dashboard');
  }
}, []);
```

---

## ✅ Testing Checklist

### **Backend Tests:**
- [ ] User registration creates User with type='driver'
- [ ] JWT contains User._id (not Driver._id)
- [ ] Driver registration creates Driver with userId field
- [ ] Driver.userId references User._id correctly
- [ ] getDriverStatusByUserId finds Driver by userId
- [ ] Go online with JWT works (finds Driver by userId)
- [ ] Driver schema has NO auth fields (email, otp, password)
- [ ] User schema has auth fields

### **Frontend Tests:**
- [ ] Register screen sends correct data
- [ ] OTP verification receives User object
- [ ] JWT is stored correctly
- [ ] CompleteRegistration screen sends correct data
- [ ] ApprovalWaiting screen fetches status correctly
- [ ] Dashboard can fetch driver profile
- [ ] Go online/offline works with JWT
- [ ] Location updates work

### **Database Tests:**
- [ ] Users collection has User records with type='driver'
- [ ] Drivers collection has Driver records with userId field
- [ ] userId in Driver matches _id in User
- [ ] Driver records have NO auth fields
- [ ] Indexes are created correctly

---

## 🚀 Start Testing

### 1. **Start Backend**
```bash
cd sitaRam/hanumanji2
npm run start:dev
```

### 2. **Start Mobile App**
```bash
cd sitaRam/LakshmanApp
npx react-native run-android
# OR
npx react-native run-ios
```

### 3. **Test Flow**
1. Open app → Language selection
2. Register with phone number
3. Verify OTP
4. Complete registration form
5. Wait on approval screen
6. Admin approves (manually via MongoDB or API)
7. Go to dashboard
8. Toggle online/offline

---

## 🔍 Common Issues to Watch For

### **Issue 1: JWT contains wrong ID**
**Symptom:** Driver not found when going online
**Fix:** Ensure JWT contains User._id, not Driver._id

### **Issue 2: Driver lookup fails**
**Symptom:** "Driver not found" error
**Fix:** Verify `DriverService.findById()` tries both Driver._id and userId

### **Issue 3: Missing userId field**
**Symptom:** Driver registration fails with validation error
**Fix:** Ensure `completeRegistration()` passes userId from JWT

### **Issue 4: Frontend expects wrong fields**
**Symptom:** Type errors or undefined fields
**Fix:** Update Driver interface in api.types.ts

---

## 📞 Need Help?

Refer to `DRIVER_USER_ARCHITECTURE.md` for detailed architecture explanation.

**Last Updated:** January 21, 2026
