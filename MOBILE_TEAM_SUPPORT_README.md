# Backend Support Team - Mobile Integration Support

**Status:** ACTIVE AND MONITORING
**Backend URL:** http://localhost:3010
**Last Updated:** January 9, 2026 at 01:25 AM

---

## ALERT: WE ARE READY

The backend team is actively monitoring for your API calls RIGHT NOW. All systems are operational and we're standing by to provide immediate support.

---

## Quick Start for Mobile Teams

### For SitaRamApp (Rider Team)
```bash
# Test your first API call
curl -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}'
```

### For LakshmanApp (Captain Team)
```bash
# Test your first API call
curl -X POST http://localhost:3010/driver/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "firstName": "Test",
    "lastName": "Driver"
  }'
```

---

## Backend Health Status

### All Systems Operational
- Backend Server: ONLINE (http://localhost:3010)
- MongoDB: CONNECTED
- Redis: CONNECTED
- WebSocket: ACTIVE
- Uptime: 85+ minutes

### Verify Backend Health
```bash
curl http://localhost:3010/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T19:51:28.741Z",
  "uptime": 5000.0,
  "environment": "development"
}
```

---

## What We're Monitoring

### Real-Time Monitoring Active
1. **HTTP Request Logger** - Logs every API call with:
   - Request method and URL
   - Request body size
   - Response status code
   - Response time
   - Slow request warnings

2. **WebSocket Monitor** - Tracks:
   - Client connections
   - Ride events
   - Location updates
   - Booking lifecycle

3. **Live Dashboard** - Updates every 2 seconds showing:
   - Server health
   - API call statistics
   - Recent activity
   - Error tracking

### Backend Logs Will Show
When you make an API call, backend console will show:
```
[HTTP] ➡️  [abc12345] POST /users/register - Body: 28B
[HTTP] ⬅️  [abc12345] POST /users/register ✅ 201 - 45ms
```

---

## Documentation Available

### 1. API Integration Documentation
**File:** API_INTEGRATION_DOCS.md (32KB, comprehensive)

Contains:
- All 16 critical endpoints
- Full curl examples
- Request/response schemas
- Error handling
- Complete flow examples
- WebSocket integration

### 2. Mobile Integration Guide
**File:** MOBILE_INTEGRATION_GUIDE.md

Platform-specific guides for:
- iOS integration
- Android integration
- Common pitfalls
- Testing strategies

### 3. Interactive API Docs (Swagger)
**URL:** http://localhost:3010/api/docs

Features:
- Try all endpoints directly
- See request/response examples
- Test with authentication
- Export OpenAPI spec

### 4. Backend Monitoring Status
**File:** BACKEND_MONITORING_STATUS.md

Current status report with:
- System health
- Monitoring tools active
- Test accounts
- Quick response guide
- 15-minute status schedule

---

## Test Accounts Ready

### Rider Account (SitaRamApp)
```
Phone: +919999888877
User ID: 69600147c9d5810295bb4971
Name: Test Rider
Status: Pre-registered
```

### Driver Account (LakshmanApp)
```
Phone: +919999777766
Driver ID: 69600158c9d5810295bb4974
Name: Test Driver
Status: Pre-registered
```

Both accounts are ready - just call register endpoint to get OTP and tokens.

---

## Common Integration Issues & Solutions

### Issue: "Cannot connect to server"
**Solution:**
1. Verify backend is running: `curl http://localhost:3010/health`
2. Check you're using correct URL: http://localhost:3010 (not https)
3. If on physical device, use your computer's IP instead of localhost
4. Check firewall settings

### Issue: "401 Unauthorized"
**Solution:**
1. Registration provides accessToken immediately - save it
2. Use Bearer format: `Authorization: Bearer {token}`
3. Token expires after 24 hours - get new one if expired
4. See example in API_INTEGRATION_DOCS.md section 1 & 3

### Issue: "400 Bad Request"
**Solution:**
1. Verify JSON format matches docs exactly
2. Phone number must include country code: `+919999888877`
3. All required fields must be present
4. Check the error message in response body

### Issue: "404 Not Found"
**Solution:**
1. Verify endpoint URL exactly: `/users/register` not `/user/register`
2. Check HTTP method: POST vs GET
3. No trailing slashes
4. See API_INTEGRATION_DOCS.md for exact URLs

### Issue: "500 Server Error"
**Solution:**
1. Contact backend team immediately
2. We'll check server logs
3. Provide the request you made
4. Include the error response

---

## How to Get Help

### Immediate Help
1. Check API_INTEGRATION_DOCS.md for endpoint details
2. Try example curl commands first
3. Check Swagger docs: http://localhost:3010/api/docs
4. Look at error message in response

### Backend Team Contact
When reporting issues, provide:
1. The endpoint you're calling
2. Request body you're sending
3. Response you received
4. Error code (401, 400, 500, etc.)
5. Platform (iOS/Android)

We're monitoring logs in real-time and will see your requests immediately.

---

## Monitoring Tools Running

### 1. API Monitor (monitor-api.js)
**Status:** RUNNING
**Features:** WebSocket events, booking lifecycle, real-time updates

### 2. Live Dashboard (live-monitor.sh)
**Status:** RUNNING
**Refresh:** Every 2 seconds
**Display:** Health, stats, activity, errors

### 3. Built-in HTTP Logger
**Status:** ACTIVE
**Logs:** Every request/response in backend console

---

## Expected API Call Flows

### Rider Flow (SitaRamApp)
1. POST /users/register → Get OTP and tokens
2. POST /users/verify-otp → Verify phone
3. GET /api/v1/riders/quick-destinations → Get nearby destinations
4. POST /bookings → Create ride
5. GET /bookings/:id → Track status
6. POST /bookings/cancel → Cancel if needed

### Driver Flow (LakshmanApp)
1. POST /driver/auth/register → Get OTP and tokens
2. POST /driver/auth/verify-otp → Verify phone
3. POST /api/v1/drivers/online → Go online
4. POST /api/v1/drivers/location → Update location (every 10s)
5. POST /bookings/driver/accept → Accept ride
6. POST /bookings/driver/start → Start ride
7. POST /bookings/driver/complete → Complete ride

---

## Key Endpoints Summary

### Authentication
- POST /users/register - Rider registration
- POST /users/verify-otp - Rider OTP verification
- POST /driver/auth/register - Driver registration
- POST /driver/auth/verify-otp - Driver OTP verification

### Rider APIs
- GET /api/v1/riders/quick-destinations - Quick destinations with fares
- GET /api/v1/riders/estimate - Custom fare estimation

### Booking APIs
- POST /bookings - Create new booking
- GET /bookings/:id - Get booking status
- POST /bookings/cancel - Cancel booking

### Driver APIs
- POST /api/v1/drivers/online - Go online
- POST /api/v1/drivers/offline - Go offline
- POST /api/v1/drivers/location - Update location
- POST /bookings/driver/accept - Accept ride
- POST /bookings/driver/start - Start ride
- POST /bookings/driver/complete - Complete ride

---

## Status Reports Schedule

Backend team will provide status updates every 15 minutes:

### Next Reports Due:
- 01:39 AM - First checkpoint
- 01:54 AM - Second checkpoint
- 02:09 AM - Third checkpoint
- *Continuing every 15 minutes*

### Each Report Includes:
- Total API calls received
- Breakdown by endpoint
- Any errors encountered
- Response time averages
- System health
- Issues/recommendations

---

## Testing Checklist

### SitaRamApp Team
- [ ] Test registration: POST /users/register
- [ ] Verify OTP: POST /users/verify-otp
- [ ] Get destinations: GET /api/v1/riders/quick-destinations
- [ ] Create booking: POST /bookings
- [ ] Track booking: GET /bookings/:id
- [ ] Cancel booking: POST /bookings/cancel
- [ ] Test with invalid data (error handling)
- [ ] Test with missing auth token (401 handling)

### LakshmanApp Team
- [ ] Test registration: POST /driver/auth/register
- [ ] Verify OTP: POST /driver/auth/verify-otp
- [ ] Go online: POST /api/v1/drivers/online
- [ ] Location updates: POST /api/v1/drivers/location
- [ ] Accept ride: POST /bookings/driver/accept
- [ ] Start ride: POST /bookings/driver/start
- [ ] Complete ride: POST /bookings/driver/complete
- [ ] Test with invalid data (error handling)
- [ ] Test with missing auth token (401 handling)

---

## Important Notes

### Authentication
- accessToken expires after 24 hours
- refreshToken expires after 365 days
- Save tokens after registration
- Include in header: `Authorization: Bearer {token}`

### Phone Numbers
- Must include country code: `+91` for India
- Format: `+919999888877` (no spaces or dashes)
- Stored without country code in database

### OTP in Development
- OTP is returned in registration response
- Also sent via SMS (but shown in response for testing)
- Valid for 5 minutes
- Use immediately after registration

### Rate Limiting
- Registration: 5 requests per minute per IP
- OTP: 3 requests per minute per phone
- Other APIs: 100 requests per minute per user

### CORS
- Currently allows all origins
- No CORS issues for mobile apps
- Backend binds to 0.0.0.0 (all interfaces)

---

## Emergency Procedures

### If Backend Goes Down
1. Check if process is running: `lsof -ti:3010`
2. Check MongoDB: `lsof -ti:27017`
3. Check Redis: `lsof -ti:6379`
4. Restart if needed: Contact backend team

### If You See Errors
1. Note the error code (400, 401, 404, 500)
2. Copy the full error response
3. Note what you were trying to do
4. Backend team is monitoring - we'll see it

### If Response is Slow
1. Backend warns on requests >1000ms
2. Check your network connection
3. Try a simpler endpoint (health check)
4. Backend team will investigate

---

## Success Indicators

### You Know Integration is Working When:
1. Registration returns 201 with tokens
2. OTP verification returns 200 with user object
3. Backend logs show your requests (we can see them)
4. Swagger docs work when you test there
5. No 500 errors (500 = backend problem, we'll fix)

### Expected Response Times
- Registration: 50-200ms
- OTP verification: 30-100ms
- Quick destinations: 100-300ms
- Create booking: 100-200ms
- Location update: 20-50ms

---

## Files Reference

### In Backend Directory (/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2)

**Documentation:**
- API_INTEGRATION_DOCS.md - Complete API reference
- MOBILE_INTEGRATION_GUIDE.md - Platform-specific guides
- BACKEND_MONITORING_STATUS.md - Current status report
- MOBILE_TEAM_SUPPORT_README.md - This file

**Monitoring Scripts:**
- monitor-api.js - WebSocket and event monitoring
- live-monitor.sh - Live dashboard
- status-dashboard.sh - Quick status check

**To Run Monitors:**
```bash
# WebSocket monitor
node monitor-api.js

# Live dashboard
./live-monitor.sh

# Quick status
./status-dashboard.sh
```

---

## Final Checklist Before Integration

### Backend Team Ready:
- [x] Backend server running on port 3010
- [x] MongoDB connected
- [x] Redis connected
- [x] WebSocket server active
- [x] Monitoring tools running
- [x] Documentation complete
- [x] Test accounts ready
- [x] Swagger docs available
- [x] Logs being captured
- [x] Team standing by

### Mobile Team Ready:
- [ ] Read API_INTEGRATION_DOCS.md
- [ ] Tested health endpoint
- [ ] Tested registration endpoint with curl
- [ ] Understand authentication flow
- [ ] Know error response format
- [ ] Have test phone numbers
- [ ] Ready to handle tokens
- [ ] Ready to handle errors

---

## WE ARE READY. START INTEGRATION NOW!

Backend is healthy, monitoring is active, documentation is complete.

**When you make your first API call, we will see it immediately.**

Good luck! We're here to help.

---

**Backend Team**
**Location:** /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
**Status:** ACTIVELY MONITORING
**Response Time:** IMMEDIATE
