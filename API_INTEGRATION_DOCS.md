# Hanumanji API Integration Documentation

**Backend Server:** http://localhost:3010
**Generated:** January 8, 2026
**API Version:** 1.0

This comprehensive guide covers ALL critical APIs for integrating with the Hanumanji ride-hailing platform.

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
   - [User Registration](#1-user-registration)
   - [User OTP Verification](#2-user-otp-verification)
   - [Driver Registration](#3-driver-registration)
   - [Driver OTP Verification](#4-driver-otp-verification)

2. [Rider APIs](#rider-apis)
   - [Get Quick Destinations](#5-get-quick-destinations)
   - [Estimate Fare](#6-estimate-fare)

3. [Booking APIs](#booking-apis)
   - [Create Booking](#7-create-booking)
   - [Get Booking Status](#8-get-booking-status)
   - [Cancel Booking](#9-cancel-booking)

4. [Driver APIs](#driver-apis)
   - [Go Online](#10-driver-go-online)
   - [Go Offline](#11-driver-go-offline)
   - [Update Location](#12-update-location)

5. [Driver Booking Actions](#driver-booking-actions)
   - [Accept Booking](#13-accept-booking)
   - [Reject Booking](#14-reject-booking)
   - [Start Ride](#15-start-ride)
   - [Complete Ride](#16-complete-ride)

6. [Complete Flow Example](#complete-flow-example)

---

## Authentication APIs

### 1. User Registration

Register a new user or login existing user via phone number. OTP is sent for verification.

**Endpoint:** `POST /users/register`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+919999888877"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}'
```

**Success Response (201 Created):**
```json
{
  "message": "Login OTP sent successfully",
  "phoneNumber": "9999888877",
  "userId": "69600147c9d5810295bb4971",
  "otpExpiry": "2026-01-08T19:39:09.032Z",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "otp": "191408"
}
```

**Notes:**
- Phone number must include country code (e.g., +91 for India)
- Returns `accessToken` and `refreshToken` immediately
- OTP is shown in response in development mode only
- OTP expires in 5 minutes
- `userId` should be saved for future API calls
- Save the `accessToken` - it's required for authenticated endpoints

**Error Responses:**
- `400 Bad Request`: Invalid phone number format
- `429 Too Many Requests`: Rate limit exceeded

---

### 2. User OTP Verification

Verify the OTP sent to user's phone number.

**Endpoint:** `POST /users/verify-otp`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+919999888877",
  "otp": "191408"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877", "otp": "191408"}'
```

**Success Response (201 Created):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "69600147c9d5810295bb4971",
    "phoneNumber": "9999888877",
    "firstName": "Test",
    "lastName": "Rider",
    "email": "9999888877@temp.com",
    "role": "user",
    "isPhoneVerified": true,
    "isVerified": true,
    "isActive": true
  }
}
```

**Notes:**
- Use the OTP received in registration response
- After successful verification, user is fully authenticated
- First-time users get default name "Test Rider"
- Users can update profile later via user update API

**Error Responses:**
- `400 Bad Request`: Invalid or expired OTP
- `404 Not Found`: User not found

---

### 3. Driver Registration

Register a new driver or login existing driver via phone number.

**Endpoint:** `POST /driver/auth/register`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "countryCode": "+91",
  "phoneNumber": "9876543210",
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "language": "hi"
}
```

**Parameters:**
- `countryCode` (required): Country code with + (e.g., "+91")
- `phoneNumber` (required): 7-15 digit phone number without country code
- `firstName` (required): Driver's first name
- `lastName` (required): Driver's last name
- `language` (optional): "en" or "hi", defaults to "en"

**curl Command:**
```bash
curl -X POST http://localhost:3010/driver/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "firstName": "Ramesh",
    "lastName": "Kumar",
    "language": "hi"
  }'
```

**Success Response (200 OK):**
```json
{
  "data": {
    "message": "Login OTP sent successfully",
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "driverId": "695d5f778300ea3ef80d97df",
    "otpExpiry": "2026-01-08T19:40:10.204Z",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "otp": "718335"
  }
}
```

**Notes:**
- Driver registration requires more details than user registration
- Returns tokens immediately (can be used after OTP verification)
- Save `driverId` for all driver-related API calls
- OTP shown in development mode only
- Language preference affects UI strings in responses

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid format
- `429 Too Many Requests`: Rate limit exceeded

---

### 4. Driver OTP Verification

Verify the OTP sent to driver's phone number.

**Endpoint:** `POST /driver/auth/verify-otp`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "countryCode": "+91",
  "phoneNumber": "9876543210",
  "otp": "718335"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/driver/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "otp": "718335"
  }'
```

**Success Response (200 OK):**
```json
{
  "data": {
    "message": "Login successful",
    "driver": {
      "id": "695d5f778300ea3ef80d97df",
      "phoneNumber": "9876543210",
      "countryCode": "+91",
      "firstName": "Ramesh",
      "lastName": "Kumar",
      "isPhoneVerified": true,
      "isVerified": false,
      "status": "offline"
    }
  }
}
```

**Notes:**
- After verification, driver can go online
- `isVerified: false` means documents not yet uploaded (for MVP, instant approval)
- Driver starts in "offline" status
- Driver must call "go online" API to start receiving ride requests

**Error Responses:**
- `400 Bad Request`: Invalid or expired OTP
- `404 Not Found`: Driver not found

---

## Rider APIs

### 5. Get Quick Destinations

Get popular destinations near user with real-time fares, ETA, and captain availability.

**Endpoint:** `GET /api/v1/riders/quick-destinations`

**Request Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}
Content-Type: application/json
```

**Query Parameters:**
- `lat` (required): User's latitude (e.g., 28.4618)
- `lng` (required): User's longitude (e.g., 77.4892)
- `userType` (optional): "student" or "regular" (default: "regular")

**curl Command:**
```bash
curl -X GET "http://localhost:3010/api/v1/riders/quick-destinations?lat=28.4618&lng=77.4892&userType=student" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "inServiceArea": true,
  "destinations": [
    {
      "id": "gl-bajaj-college",
      "name": "GL Bajaj College",
      "nameHi": "GL बजाज कॉलेज",
      "icon": "🎓",
      "category": "college",
      "landmark": "GL Bajaj Institute Main Campus",
      "landmarkHi": "GL बजाज इंस्टिट्यूट मुख्य कैंपस",
      "coordinates": {
        "lat": 28.4657,
        "lng": 77.4968
      },
      "distanceFromYou": 0.86,
      "estimatedFare": 22,
      "fareBreakdown": {
        "base": 15,
        "distance": 6,
        "time": 3,
        "surge": 0,
        "discount": 2
      },
      "savingsVsRapido": 18,
      "percentSaved": 45,
      "estimatedTime": 3,
      "captainsNearby": 1,
      "eta": 5,
      "displayFare": "₹22",
      "displaySavings": "Save ₹18 vs Rapido",
      "displayFareHi": "₹22",
      "displaySavingsHi": "Rapido से ₹18 बचाएं"
    }
  ],
  "marketInfo": {
    "captainsOnline": 1,
    "captainsAvailable": 1,
    "averageWaitTime": 2,
    "message": "1 captains online nearby",
    "messageHi": "1 captains आपके पास online हैं"
  },
  "phaseInfo": {
    "currentPhase": "Phase 1: Market Entry",
    "studentDiscount": 10,
    "description": "Heavy subsidies to build market"
  }
}
```

**Notes:**
- Requires authentication (user access token)
- Returns top 10 nearest destinations sorted by distance
- All calculations done on backend (fare, distance, ETA, savings)
- Includes both English and Hindi text for UI
- Student users get additional discounts
- Returns real-time captain availability
- `inServiceArea: false` if user is outside Pari Chowk (5km radius)

**Out of Service Area Response:**
```json
{
  "inServiceArea": false,
  "message": "Service not available in your area yet...",
  "messageHi": "आपके area में अभी service available नहीं है...",
  "nearestServiceArea": {
    "name": "Pari Chowk",
    "distance": 12.5
  }
}
```

---

### 6. Estimate Fare

Estimate fare for custom pickup and drop locations.

**Endpoint:** `GET /api/v1/riders/estimate`

**Request Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}
Content-Type: application/json
```

**Query Parameters:**
- `pickupLat` (required): Pickup latitude
- `pickupLng` (required): Pickup longitude
- `dropLat` (required): Drop latitude
- `dropLng` (required): Drop longitude
- `userType` (optional): "student" or "regular"

**curl Command:**
```bash
curl -X GET "http://localhost:3010/api/v1/riders/estimate?pickupLat=28.4618&pickupLng=77.4892&dropLat=28.4650&dropLng=77.4950&userType=student" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "serviceAvailable": true,
  "inServiceArea": true,
  "fare": {
    "total": 20,
    "breakdown": {
      "base": 15,
      "distance": 5,
      "time": 2,
      "surge": 0,
      "discount": 2
    },
    "captainEarns": 20,
    "commission": 0
  },
  "distance": 0.67,
  "estimatedDuration": 2,
  "comparison": {
    "rapidoEstimate": 40,
    "youSave": 20,
    "percentSaved": 50
  },
  "captainsAvailable": 1,
  "estimatedWaitTime": 2,
  "displayText": {
    "fare": "₹20",
    "savings": "Save ₹20 vs Rapido",
    "eta": "2 min",
    "captainEarns": "Captain earns ₹20"
  },
  "displayTextHi": {
    "fare": "₹20",
    "savings": "Rapido से ₹20 बचाएं",
    "eta": "2 मिनट",
    "captainEarns": "Captain ₹20 कमाएगा"
  }
}
```

**Notes:**
- Validates both pickup and drop are within service area
- Returns detailed fare breakdown
- Shows captain earnings (transparent pricing)
- Includes comparison with Rapido
- Real-time captain availability check
- All UI strings provided by backend

**Out of Service Response:**
```json
{
  "serviceAvailable": false,
  "message": "Pickup or drop location outside service area",
  "messageHi": "Pickup या drop location service area के बाहर है"
}
```

---

## Booking APIs

### 7. Create Booking

Create a new ride booking. The system automatically starts searching for nearby captains.

**Endpoint:** `POST /bookings`

**Request Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "pickupLocation": {
    "address": "Pari Chowk, Greater Noida",
    "latitude": 28.4618,
    "longitude": 77.4892,
    "landmark": "Near Metro Station"
  },
  "dropLocation": {
    "address": "GL Bajaj College, Greater Noida",
    "latitude": 28.4657,
    "longitude": 77.4968,
    "landmark": "Main Gate"
  },
  "vehicleType": "bike",
  "paymentMethod": "cash",
  "promoCode": "STUDENT10"
}
```

**Parameters:**
- `pickupLocation` (required): Full location object with address, lat, lng
- `dropLocation` (required): Full location object
- `vehicleType` (required): "bike", "auto", or "cab"
- `paymentMethod` (optional): "cash" or "online" (default: "cash")
- `promoCode` (optional): Promo code for additional discount

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "address": "Pari Chowk, Greater Noida",
      "latitude": 28.4618,
      "longitude": 77.4892
    },
    "dropLocation": {
      "address": "GL Bajaj College",
      "latitude": 28.4657,
      "longitude": 77.4968
    },
    "vehicleType": "bike",
    "paymentMethod": "cash"
  }'
```

**Success Response (201 Created):**
```json
{
  "bookingId": "bk_abc123xyz",
  "status": "pending",
  "pickupLocation": {
    "address": "Pari Chowk, Greater Noida",
    "latitude": 28.4618,
    "longitude": 77.4892
  },
  "dropLocation": {
    "address": "GL Bajaj College",
    "latitude": 28.4657,
    "longitude": 77.4968
  },
  "vehicleType": "bike",
  "estimatedFare": 22,
  "estimatedDistance": 0.86,
  "estimatedDuration": 3,
  "otp": "1234",
  "message": "Searching for captain...",
  "messageHi": "Captain ढूंढ रहे हैं..."
}
```

**Notes:**
- Booking is created with status "pending"
- System automatically searches for nearby captains
- OTP is generated for ride verification
- Save `bookingId` for tracking booking status
- Captain matching happens in background
- Use WebSocket or polling to get real-time updates

**Booking Status Flow:**
1. `pending` - Searching for captain
2. `accepted` - Captain accepted the ride
3. `driver_arrived` - Captain reached pickup
4. `in_progress` - Ride started
5. `completed` - Ride completed
6. `cancelled` - Ride cancelled

**Error Responses:**
- `400 Bad Request`: Invalid location or outside service area
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: No captains available

---

### 8. Get Booking Status

Get current status of a booking with real-time updates.

**Endpoint:** `GET /bookings/:id`

**Request Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}
```

**curl Command:**
```bash
curl -X GET http://localhost:3010/bookings/bk_abc123xyz \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "bookingId": "bk_abc123xyz",
  "status": "accepted",
  "pickupLocation": {
    "address": "Pari Chowk",
    "latitude": 28.4618,
    "longitude": 77.4892
  },
  "dropLocation": {
    "address": "GL Bajaj College",
    "latitude": 28.4657,
    "longitude": 77.4968
  },
  "estimatedFare": 22,
  "otp": "1234",
  "driver": {
    "id": "drv_xyz789",
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "vehicleNumber": "UP16AB1234",
    "rating": 4.8,
    "currentLocation": {
      "latitude": 28.4625,
      "longitude": 77.4900
    },
    "eta": 3
  }
}
```

**Notes:**
- Poll this endpoint every 5-10 seconds for status updates
- Driver details appear when status is "accepted" or later
- `driver.currentLocation` updates in real-time
- ETA calculated based on captain's current location
- Use WebSocket for better real-time experience

---

### 9. Cancel Booking

Cancel an active booking (rider side).

**Endpoint:** `POST /bookings/cancel`

**Request Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "bk_abc123xyz",
  "reason": "Change of plans"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123xyz",
    "reason": "Change of plans"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "bookingId": "bk_abc123xyz",
  "status": "cancelled",
  "cancellationFee": 0,
  "message": "Booking cancelled successfully",
  "messageHi": "Booking cancel हो गई"
}
```

**Notes:**
- Free cancellation before captain accepts
- May have cancellation fee after acceptance (currently ₹0 for MVP)
- Captain is notified immediately
- Refund processed automatically if payment was made

**Error Responses:**
- `400 Bad Request`: Booking already completed or cancelled
- `404 Not Found`: Booking not found

---

## Driver APIs

### 10. Driver Go Online

Go online and start receiving ride requests. Adds driver to the available captain pool.

**Endpoint:** `POST /api/v1/drivers/online`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "driverId": "695d5f778300ea3ef80d97df",
  "location": {
    "latitude": 28.4618,
    "longitude": 77.4892,
    "heading": 45,
    "speed": 0
  }
}
```

**Parameters:**
- `driverId` (required): Driver ID from registration
- `location` (required): Current GPS location
  - `latitude`, `longitude` (required)
  - `heading` (optional): Direction in degrees (0-360)
  - `speed` (optional): Speed in km/h

**curl Command:**
```bash
curl -X POST http://localhost:3010/api/v1/drivers/online \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "695d5f778300ea3ef80d97df",
    "location": {
      "latitude": 28.4618,
      "longitude": 77.4892,
      "heading": 45,
      "speed": 0
    }
  }'
```

**Success Response (200 OK):**
```json
{
  "status": "ONLINE",
  "onlineSince": "2026-01-08T19:34:49.233Z",
  "serviceArea": "Pari Chowk (5km radius)",
  "serviceAreaHi": "परी चौक (5km radius)",
  "inServiceArea": true,
  "marketConditions": {
    "captainsOnline": 5,
    "captainsAvailable": 3,
    "captainsBusy": 2,
    "expectedRidesPerHour": 4,
    "averageFarePerRide": 45,
    "expectedHourlyEarnings": 180,
    "displayMessage": "You're online! 3 captains available in your area.",
    "displayMessageHi": "आप online हैं! आपके area में 3 captains available हैं।"
  },
  "todayStats": {
    "ridesCompleted": 0,
    "earnings": 0,
    "hoursOnline": 0,
    "averageRating": 5.0
  }
}
```

**Notes:**
- Driver must be online to receive ride requests
- Location is added to Redis geospatial index
- Provides market intelligence (captains online, expected earnings)
- Driver can see today's stats
- Must be within service area (Pari Chowk 5km radius)

**Out of Service Area:**
```json
{
  "status": "OFFLINE",
  "inServiceArea": false,
  "message": "You are outside service area",
  "messageHi": "आप service area के बाहर हैं",
  "nearestServiceArea": {
    "name": "Pari Chowk",
    "distance": 8.5
  }
}
```

---

### 11. Driver Go Offline

Go offline and stop receiving ride requests.

**Endpoint:** `POST /api/v1/drivers/offline`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "driverId": "695d5f778300ea3ef80d97df"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/api/v1/drivers/offline \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"driverId": "695d5f778300ea3ef80d97df"}'
```

**Success Response (200 OK):**
```json
{
  "status": "OFFLINE",
  "offlineSince": "2026-01-08T20:15:30.000Z",
  "todayStats": {
    "ridesCompleted": 12,
    "earnings": 540,
    "hoursOnline": 3.5
  },
  "message": "You're offline. Today: ₹540 from 12 rides.",
  "messageHi": "आप offline हैं। आज: ₹540, 12 rides।"
}
```

**Notes:**
- Driver removed from available captain pool
- Returns daily summary
- Cannot receive new ride requests when offline
- Should not go offline during active ride

---

### 12. Update Location

Update driver's current location (called every 10 seconds when online).

**Endpoint:** `POST /api/v1/drivers/location`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "driverId": "695d5f778300ea3ef80d97df",
  "location": {
    "latitude": 28.4625,
    "longitude": 77.4900,
    "heading": 90,
    "speed": 25
  }
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/api/v1/drivers/location \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "695d5f778300ea3ef80d97df",
    "location": {
      "latitude": 28.4625,
      "longitude": 77.4900,
      "heading": 90,
      "speed": 25
    }
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "timestamp": "2026-01-08T19:35:00.000Z"
}
```

**Notes:**
- Call this every 10 seconds when driver is online
- Location updates are broadcast to riders tracking the captain
- Updates Redis geospatial index for captain matching
- Heading and speed help riders see captain movement
- Lightweight response for frequent polling

---

## Driver Booking Actions

### 13. Accept Booking

Captain accepts a ride request.

**Endpoint:** `POST /bookings/driver/accept`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "bk_abc123xyz"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings/driver/accept \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "bk_abc123xyz"}'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "bookingId": "bk_abc123xyz",
  "status": "accepted",
  "pickup": {
    "address": "Pari Chowk",
    "latitude": 28.4618,
    "longitude": 77.4892,
    "landmark": "Near Metro"
  },
  "drop": {
    "address": "GL Bajaj College",
    "latitude": 28.4657,
    "longitude": 77.4968
  },
  "rider": {
    "name": "Test Rider",
    "phone": "9999888877"
  },
  "fare": 22,
  "distance": 0.86,
  "otp": "1234",
  "navigation": {
    "nextTurn": "Turn right in 200m",
    "eta": 3,
    "distance": 0.5
  },
  "message": "Ride accepted! Navigate to pickup location",
  "messageHi": "Ride accept की! Pickup location पर जाएं"
}
```

**Notes:**
- Driver gets rider contact information
- Navigation details to pickup location
- OTP shown to verify rider at pickup
- Rider is notified immediately
- Booking status changes to "accepted"

**Error Responses:**
- `400 Bad Request`: Ride already accepted by another captain
- `404 Not Found`: Booking not found

---

### 14. Reject Booking

Captain rejects a ride request.

**Endpoint:** `POST /bookings/driver/reject`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "bk_abc123xyz",
  "reason": "Too far from current location"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings/driver/reject \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123xyz",
    "reason": "Too far from current location"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Ride rejected",
  "messageHi": "Ride reject कर दिया"
}
```

**Notes:**
- System automatically offers ride to next nearest captain
- No penalty for rejection (for MVP)
- Reason is logged for analytics
- Rider not notified (seamless experience)

---

### 15. Start Ride

Start the ride after OTP verification at pickup location.

**Endpoint:** `POST /bookings/driver/start`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "bk_abc123xyz",
  "otp": "1234"
}
```

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings/driver/start \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123xyz",
    "otp": "1234"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "bookingId": "bk_abc123xyz",
  "status": "in_progress",
  "startTime": "2026-01-08T19:40:00.000Z",
  "destination": {
    "address": "GL Bajaj College",
    "latitude": 28.4657,
    "longitude": 77.4968
  },
  "navigation": {
    "nextTurn": "Continue straight for 500m",
    "eta": 3,
    "distance": 0.86
  },
  "message": "Ride started! Navigate to drop location",
  "messageHi": "Ride शुरू हो गई! Drop location पर जाएं"
}
```

**Notes:**
- OTP verification required for security
- Ride tracking begins
- Timer starts for fare calculation
- Rider gets notification that ride started
- Navigation to drop location provided

**Error Responses:**
- `400 Bad Request`: Invalid OTP
- `404 Not Found`: Booking not found

---

### 16. Complete Ride

Complete the ride and calculate final earnings.

**Endpoint:** `POST /bookings/driver/complete`

**Request Headers:**
```
Authorization: Bearer {DRIVER_ACCESS_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "bk_abc123xyz",
  "actualDistance": 900,
  "actualDuration": 180
}
```

**Parameters:**
- `bookingId` (required): Booking ID
- `actualDistance` (optional): Actual distance in meters (from GPS)
- `actualDuration` (optional): Actual duration in seconds

**curl Command:**
```bash
curl -X POST http://localhost:3010/bookings/driver/complete \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123xyz",
    "actualDistance": 900,
    "actualDuration": 180
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "bookingId": "bk_abc123xyz",
  "status": "completed",
  "completedAt": "2026-01-08T19:43:00.000Z",
  "fare": {
    "total": 22,
    "breakdown": {
      "base": 15,
      "distance": 7,
      "time": 3,
      "discount": 3
    }
  },
  "earnings": {
    "gross": 22,
    "commission": 0,
    "net": 22
  },
  "rideDetails": {
    "distance": 0.9,
    "duration": 3,
    "startTime": "2026-01-08T19:40:00.000Z",
    "endTime": "2026-01-08T19:43:00.000Z"
  },
  "todayEarnings": {
    "totalRides": 13,
    "totalEarnings": 562,
    "averagePerRide": 43
  },
  "message": "Ride completed! You earned ₹22",
  "messageHi": "Ride पूरी हो गई! आपने ₹22 कमाए"
}
```

**Notes:**
- Final fare calculated based on actual distance/time
- Captain earnings shown with transparent breakdown
- 0% commission in Phase 1 (MVP)
- Rider prompted for rating
- Payment collected (cash or online)
- Today's cumulative earnings updated

---

## Complete Flow Example

Here's a complete end-to-end flow demonstrating the entire ride lifecycle:

### Step 1: User Registration & Authentication

```bash
# Register user
curl -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}'

# Response includes: userId, accessToken, otp

# Verify OTP
curl -X POST http://localhost:3010/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877", "otp": "123456"}'
```

### Step 2: Driver Registration & Go Online

```bash
# Register driver
curl -X POST http://localhost:3010/driver/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "firstName": "Ramesh",
    "lastName": "Kumar"
  }'

# Response includes: driverId, accessToken, otp

# Verify OTP
curl -X POST http://localhost:3010/driver/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "otp": "654321"
  }'

# Go online
curl -X POST http://localhost:3010/api/v1/drivers/online \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "drv_123",
    "location": {"latitude": 28.4618, "longitude": 77.4892}
  }'
```

### Step 3: Rider Creates Booking

```bash
# Get fare estimate
curl -X GET "http://localhost:3010/api/v1/riders/estimate?pickupLat=28.4618&pickupLng=77.4892&dropLat=28.4657&dropLng=77.4968&userType=student" \
  -H "Authorization: Bearer USER_TOKEN"

# Create booking
curl -X POST http://localhost:3010/bookings \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "address": "Pari Chowk",
      "latitude": 28.4618,
      "longitude": 77.4892
    },
    "dropLocation": {
      "address": "GL Bajaj College",
      "latitude": 28.4657,
      "longitude": 77.4968
    },
    "vehicleType": "bike"
  }'

# Response includes: bookingId, otp, status: "pending"
```

### Step 4: Driver Receives & Accepts Booking

```bash
# Driver receives notification via WebSocket (automatic)
# Driver accepts ride
curl -X POST http://localhost:3010/bookings/driver/accept \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "bk_abc123"}'

# Rider gets notification that captain is on the way
```

### Step 5: Driver Arrives & Starts Ride

```bash
# Driver marks arrived
curl -X POST http://localhost:3010/bookings/driver/arrived \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "bk_abc123"}'

# Start ride with OTP
curl -X POST http://localhost:3010/bookings/driver/start \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123",
    "otp": "1234"
  }'
```

### Step 6: Complete Ride

```bash
# Complete ride
curl -X POST http://localhost:3010/bookings/driver/complete \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "bk_abc123",
    "actualDistance": 900,
    "actualDuration": 180
  }'

# Response includes earnings breakdown and today's total
```

---

## Important Notes

### Authentication
- All endpoints except registration/OTP require Bearer token authentication
- Tokens expire after 24 hours (access token) and 365 days (refresh token)
- Use refresh token endpoint to get new access token

### Rate Limiting
- Registration APIs: 5 requests per minute per IP
- OTP APIs: 3 requests per minute per phone number
- Other APIs: 100 requests per minute per user

### WebSocket Events
For real-time updates, connect to WebSocket:
```javascript
const socket = io('http://localhost:3010', {
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

// Rider events
socket.on('captain-matched', (data) => {
  // Captain found and assigned
});

socket.on('captain-location', (data) => {
  // Real-time captain location updates
});

socket.on('ride-status-updated', (data) => {
  // Ride status changed
});

// Driver events
socket.on('new-ride-request', (data) => {
  // New ride request nearby
});

socket.on('ride-cancelled', (data) => {
  // Rider cancelled the booking
});
```

### Error Handling
All errors follow consistent format:
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request data",
  "timestamp": "2026-01-08T19:35:00.000Z",
  "path": "/bookings",
  "method": "POST",
  "requestId": "uuid-here"
}
```

### Testing Tips
1. Use development OTP (shown in response) for testing
2. Start driver online before testing booking flow
3. Ensure locations are within Pari Chowk service area (28.4618, 77.4892 ± 5km)
4. Test with both "student" and "regular" user types for fare differences
5. Use Swagger docs at http://localhost:3010/api/docs for interactive testing

### Support
- API Documentation: http://localhost:3010/api/docs
- Backend Repository: /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
- For issues: Check server logs and error responses

---

**Last Updated:** January 8, 2026
**Document Version:** 1.0
**Backend Version:** 1.0.0
