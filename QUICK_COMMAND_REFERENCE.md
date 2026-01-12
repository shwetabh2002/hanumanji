# Quick Command Reference - Backend Support Team

**Fast reference for monitoring and debugging mobile team integration**

---

## Health Checks

### Check Backend Status
```bash
curl http://localhost:3010/health
```

### Check All Services
```bash
lsof -i :3010  # Backend
lsof -i :27017 # MongoDB
lsof -i :6379  # Redis
```

### Quick Status Dashboard
```bash
cd /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
./status-dashboard.sh
```

---

## Start Monitoring

### WebSocket Event Monitor
```bash
cd /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
node monitor-api.js
```

### Live Dashboard (Auto-refresh)
```bash
cd /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
./live-monitor.sh
```

---

## Test API Calls

### Test Rider Registration
```bash
curl -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}'
```

### Test Driver Registration
```bash
curl -X POST http://localhost:3010/driver/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "+91",
    "phoneNumber": "9876543210",
    "firstName": "Test",
    "lastName": "Driver"
  }'
```

### Test OTP Verification (Rider)
```bash
# Replace OTP with actual OTP from registration response
curl -X POST http://localhost:3010/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877", "otp": "123456"}'
```

### Test Quick Destinations (Requires Auth)
```bash
# Replace TOKEN with actual accessToken
curl -X GET "http://localhost:3010/api/v1/riders/quick-destinations?lat=28.4618&lng=77.4892&userType=student" \
  -H "Authorization: Bearer TOKEN"
```

### Test Create Booking (Requires Auth)
```bash
# Replace TOKEN with actual accessToken
curl -X POST http://localhost:3010/bookings \
  -H "Authorization: Bearer TOKEN" \
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
```

---

## Check Logs

### View Backend Process
```bash
ps aux | grep "node.*3010"
```

### Check Process Health
```bash
lsof -ti:3010  # Get PID
ps -p $(lsof -ti:3010) -o pid,etime,cmd  # Show uptime
```

---

## Debug Issues

### Test Connection
```bash
curl -v http://localhost:3010/health
```

### Check CORS
```bash
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3010/users/register
```

### Test Invalid Request (Should Return 400)
```bash
curl -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "invalid"}'
```

### Test Missing Auth (Should Return 401)
```bash
curl -X GET "http://localhost:3010/api/v1/riders/quick-destinations?lat=28.4618&lng=77.4892"
```

---

## Monitor Network

### Watch Connections
```bash
lsof -i :3010 -r 2  # Refresh every 2 seconds
```

### Check Active Connections Count
```bash
lsof -i :3010 | wc -l
```

---

## Documentation Quick Access

### View API Docs in Browser
```bash
open http://localhost:3010/api/docs
# or
curl http://localhost:3010/api/docs
```

### Read Documentation Files
```bash
cd /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2

# Comprehensive API reference
cat API_INTEGRATION_DOCS.md

# Mobile integration guide
cat MOBILE_INTEGRATION_GUIDE.md

# Current monitoring status
cat BACKEND_MONITORING_STATUS.md

# Mobile team support guide
cat MOBILE_TEAM_SUPPORT_README.md
```

---

## Emergency Commands

### Restart Backend (if needed)
```bash
cd /Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
npm run start:dev
```

### Kill Backend Process
```bash
kill $(lsof -ti:3010)
```

### Check MongoDB Connection
```bash
mongosh --eval "db.adminCommand('ping')"
```

### Check Redis Connection
```bash
redis-cli ping
```

---

## Extract Information

### Get Latest Registration
```bash
curl -s http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}' | jq '.'
```

### Parse Response for Token
```bash
curl -s http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}' | jq -r '.accessToken'
```

### Parse Response for OTP
```bash
curl -s http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}' | jq -r '.otp'
```

---

## Test Accounts

### Rider Test Account
```
Phone: +919999888877
User ID: 69600147c9d5810295bb4971
```

### Driver Test Account
```
Phone: +919999777766
Driver ID: 69600158c9d5810295bb4974
```

---

## Quick Troubleshooting

### Issue: Backend not responding
```bash
# Check if running
lsof -ti:3010 || echo "Backend not running"

# Check health
curl -f http://localhost:3010/health || echo "Backend unhealthy"
```

### Issue: Can't connect to MongoDB
```bash
# Check MongoDB process
lsof -ti:27017 || echo "MongoDB not running"

# Start MongoDB if needed
brew services start mongodb-community
```

### Issue: Can't connect to Redis
```bash
# Check Redis process
lsof -ti:6379 || echo "Redis not running"

# Start Redis if needed
brew services start redis
```

---

## Monitoring Shortcuts

### One-liner Full Status
```bash
echo "Backend: $(curl -s http://localhost:3010/health | jq -r .status)" && \
echo "MongoDB: $( (lsof -i :27017 > /dev/null 2>&1 && echo "OK") || echo "DOWN" )" && \
echo "Redis: $( (lsof -i :6379 > /dev/null 2>&1 && echo "OK") || echo "DOWN" )"
```

### Watch Backend Health (Updates every 5s)
```bash
watch -n 5 'curl -s http://localhost:3010/health | jq .'
```

### Monitor Request Rate
```bash
# Count requests per minute (if logs are written to file)
# Note: Currently logs go to stdout
```

---

## Environment Info

### Backend Location
```
/Users/shwetabh/Desktop/notes-it/sitaRam/hanumanji2
```

### Key Files
- `src/main.ts` - Main application entry
- `.env` - Environment configuration
- `package.json` - Dependencies and scripts
- `monitor-api.js` - WebSocket monitoring script
- `live-monitor.sh` - Live dashboard script

### URLs
- Backend: http://localhost:3010
- Swagger: http://localhost:3010/api/docs
- Health: http://localhost:3010/health
- WebSocket: ws://localhost:3010

---

## Common Patterns

### Full Registration Flow Test
```bash
# 1. Register
RESPONSE=$(curl -s -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}')

# 2. Extract OTP
OTP=$(echo $RESPONSE | jq -r '.otp')
echo "OTP: $OTP"

# 3. Verify OTP
curl -X POST http://localhost:3010/users/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"+919999888877\", \"otp\": \"$OTP\"}"
```

### Get Token and Make Authenticated Call
```bash
# 1. Register and get token
TOKEN=$(curl -s -X POST http://localhost:3010/users/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919999888877"}' | jq -r '.accessToken')

# 2. Use token for authenticated call
curl -X GET "http://localhost:3010/api/v1/riders/quick-destinations?lat=28.4618&lng=77.4892" \
  -H "Authorization: Bearer $TOKEN"
```

---

**Keep this file open for quick reference during mobile team integration!**
