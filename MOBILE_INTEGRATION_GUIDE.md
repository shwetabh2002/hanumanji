# Mobile Teams Integration Guide - Backend Support

## Backend Server Status
- **URL**: http://localhost:3010
- **Status**: RUNNING ✅
- **Environment**: Development
- **MongoDB**: Connected ✅
- **Redis**: Connected ✅

## Test Accounts Created

### Test Rider
- **Phone**: +919999888877
- **Name**: Test Rider
- **User ID**: 69600147c9d5810295bb4971
- **Access Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTYwMDE0N2M5ZDU4MTAyOTViYjQ5NzEiLCJyb2xlIjoidXNlciIsInBob25lTnVtYmVyIjoiOTk5OTg4ODg3NyIsImNvdW50cnlDb2RlIjoiKzkxIiwiaWF0IjoxNzY3ODk5NDYzLCJleHAiOjE3Njc5ODU4NjN9.dpbTTC7W-5CH90bbM0GO9UUhzNGuVtQD8sR026jMMWE`

### Test Driver
- **Phone**: +919999777766
- **Name**: Test Driver
- **Driver ID**: 69600158c9d5810295bb4974
- **Access Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTYwMDE1OGM5ZDU4MTAyOTViYjQ5NzQiLCJyb2xlIjoiZHJpdmVyIiwicGhvbmVOdW1iZXIiOiI5OTk5Nzc3NzY2IiwiY291bnRyeUNvZGUiOiIrOTEiLCJpYXQiOjE3Njc4OTk0ODAsImV4cCI6MTc2Nzk4NTg4MH0.paTGyEv0UTWkDGGvX6TwMHV8ioTyZrfAhNX5xsQGauk`

---

## API Endpoints Reference

### 🔐 Authentication Endpoints

#### 1. Register User (SitaRamApp - Rider)
```bash
POST http://localhost:3010/users/register
Content-Type: application/json

{
  "phoneNumber": "+919999888877",
  "firstName": "Test",
  "lastName": "Rider"
}

Response:
{
  "message": "OTP sent successfully",
  "userId": "...",
  "phoneNumber": "...",
  "accessToken": "...",
  "refreshToken": "...",
  "otp": "785579"  # In dev mode only
}
```

#### 2. Verify OTP (Both Apps)
```bash
POST http://localhost:3010/users/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+919999888877",
  "otp": "785579"
}
```

#### 3. Register Driver (LakshmanApp - Captain)
```bash
POST http://localhost:3010/driver/auth/register
Content-Type: application/json

{
  "countryCode": "+91",
  "phoneNumber": "9999777766",
  "firstName": "Test",
  "lastName": "Driver",
  "language": "en"
}
```

#### 4. Verify Driver OTP
```bash
POST http://localhost:3010/driver/auth/verify-otp
Content-Type: application/json

{
  "countryCode": "+91",
  "phoneNumber": "9999777766",
  "otp": "537600"
}
```

---

### 🚗 Driver Endpoints (LakshmanApp)

**All require Authorization header**: `Authorization: Bearer <access_token>`

#### 1. Go Online
```bash
POST http://localhost:3010/drivers/status
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "status": "online"
}
```

#### 2. Update Location (Every 3-5 seconds)
```bash
POST http://localhost:3010/drivers/location
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "latitude": 28.4595,
  "longitude": 77.5054,
  "heading": 90,
  "speed": 30
}
```

#### 3. Get Current Booking
```bash
GET http://localhost:3010/bookings/driver/current
Authorization: Bearer <driver_token>
```

#### 4. Accept Booking
```bash
POST http://localhost:3010/bookings/driver/accept
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "bookingId": "booking_id_here"
}
```

#### 5. Start Ride (with OTP)
```bash
POST http://localhost:3010/bookings/driver/start
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "bookingId": "booking_id_here",
  "otp": "123456"
}
```

#### 6. Complete Ride
```bash
POST http://localhost:3010/bookings/driver/complete
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "bookingId": "booking_id_here"
}
```

---

### 🧑‍💼 Rider Endpoints (SitaRamApp)

**All require Authorization header**: `Authorization: Bearer <access_token>`

#### 1. Get Fare Estimate
```bash
GET http://localhost:3010/bookings/estimate/fare?pickupLat=28.4595&pickupLng=77.5054&dropLat=28.4700&dropLng=77.5150&vehicleType=bike
Authorization: Bearer <user_token>
```

#### 2. Create Booking
```bash
POST http://localhost:3010/bookings
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "pickupLocation": {
    "address": "Pari Chowk",
    "latitude": 28.4595,
    "longitude": 77.5054,
    "landmark": "Near Metro Station"
  },
  "dropLocation": {
    "address": "Knowledge Park",
    "latitude": 28.4700,
    "longitude": 77.5150,
    "landmark": "Gate 1"
  },
  "vehicleType": "bike",
  "paymentMethod": "cash"
}

Response:
{
  "bookingId": "...",
  "status": "pending",
  "otp": "123456",
  "estimatedFare": 45,
  "estimatedDistance": 2.5,
  "estimatedDuration": 8
}
```

#### 3. Get Current Booking
```bash
GET http://localhost:3010/bookings/current
Authorization: Bearer <user_token>
```

#### 4. Cancel Booking
```bash
POST http://localhost:3010/bookings/cancel
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "bookingId": "booking_id_here",
  "reason": "Changed my mind"
}
```

#### 5. Get Booking History
```bash
GET http://localhost:3010/bookings/history?limit=10&skip=0
Authorization: Bearer <user_token>
```

---

## 🔌 WebSocket Connection

### Connection URL
```
ws://localhost:3010
```

### Events to Listen For

#### For SitaRamApp (Rider):
```javascript
socket.on('ride_matched', (data) => {
  // Captain found
  console.log('Captain:', data.captain);
  console.log('Booking ID:', data.bookingId);
});

socket.on('ride_started', (data) => {
  // Ride started
  console.log('Ride started at:', data.startTime);
});

socket.on('captain_location', (data) => {
  // Real-time captain location updates
  console.log('Captain location:', data.location);
});

socket.on('ride_completed', (data) => {
  // Ride completed
  console.log('Ride completed');
});

socket.on('ride_cancelled', (data) => {
  // Ride cancelled
  console.log('Cancelled by:', data.cancelledBy);
});
```

#### For LakshmanApp (Captain):
```javascript
socket.on('ride_request', (data) => {
  // New ride request
  console.log('New ride request:', data.bookingId);
  console.log('Pickup:', data.pickup);
  console.log('Expires in:', data.expiresIn, 'seconds');
});

socket.on('ride_started', (data) => {
  // Ride started
});

socket.on('ride_completed', (data) => {
  // Ride completed
});

socket.on('ride_cancelled', (data) => {
  // Ride cancelled
});
```

### Register Client
After connection, send:
```javascript
socket.emit('register', {
  userId: 'user_or_driver_id',
  userType: 'rider' // or 'driver'
});
```

---

## 🧪 Testing the Flow

### Step 1: Driver Goes Online (LakshmanApp)
```bash
# 1. Register WebSocket
socket.emit('register', {
  userId: '69600158c9d5810295bb4974',
  userType: 'driver'
});

# 2. Update status to online
POST /drivers/status { "status": "online" }

# 3. Start sending location updates every 3-5 seconds
POST /drivers/location { "latitude": 28.4595, "longitude": 77.5054 }
```

### Step 2: Rider Creates Booking (SitaRamApp)
```bash
# 1. Register WebSocket
socket.emit('register', {
  userId: '69600147c9d5810295bb4971',
  userType: 'rider'
});

# 2. Create booking
POST /bookings { ... }

# 3. Listen for ride_matched event
socket.on('ride_matched', ...)
```

### Step 3: Driver Accepts Ride (LakshmanApp)
```bash
# Listen for ride_request event
socket.on('ride_request', (data) => {
  // Accept the ride
  POST /bookings/driver/accept { "bookingId": data.bookingId }
});
```

### Step 4: Driver Starts Ride
```bash
POST /bookings/driver/start {
  "bookingId": "...",
  "otp": "123456"  # OTP from booking creation
}
```

### Step 5: Driver Completes Ride
```bash
POST /bookings/driver/complete {
  "bookingId": "..."
}
```

---

## 📊 Monitoring & Debugging

### Check Server Logs
Backend logs will show:
- Incoming API requests
- WebSocket connections
- Booking creation/updates
- Location updates

### Health Check
```bash
GET http://localhost:3010/health
```

### API Documentation
```
http://localhost:3010/api/docs
```

---

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" Error
**Solution**: Include Authorization header with Bearer token:
```
Authorization: Bearer <access_token>
```

### Issue: WebSocket Not Connecting
**Solution**:
1. Check WebSocket URL: `ws://localhost:3010`
2. Ensure backend is running
3. Register client after connection

### Issue: No Ride Requests Received
**Solution**:
1. Ensure driver is online (POST /drivers/status)
2. Ensure driver is registered on WebSocket
3. Check driver location is being updated

### Issue: OTP Verification Failed
**Solution**: In development, OTP is returned in registration response

---

## 📞 Backend Team Support

**Backend Lead**: Available for support

**Response Time**: Immediate during integration

**Issues to Report**:
1. API errors (with request/response)
2. WebSocket connection issues
3. Booking flow problems
4. Authentication issues

**How to Report**:
- Provide exact request/response
- Include error messages
- Share screenshots if UI issue

---

## ✅ Integration Checklist

### SitaRamApp (Rider)
- [ ] User registration flow
- [ ] OTP verification
- [ ] Fare estimation
- [ ] Booking creation
- [ ] WebSocket connection
- [ ] Ride tracking
- [ ] Ride cancellation

### LakshmanApp (Captain)
- [ ] Driver registration
- [ ] OTP verification
- [ ] Go online/offline
- [ ] Location updates
- [ ] WebSocket connection
- [ ] Ride request reception
- [ ] Ride acceptance
- [ ] OTP-based ride start
- [ ] Ride completion

---

**Last Updated**: 2026-01-08 19:15 UTC
**Backend Version**: 1.0.0
**Server Status**: RUNNING ✅
