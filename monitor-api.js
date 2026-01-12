#!/usr/bin/env node

/**
 * Backend API Monitoring Script
 *
 * Monitors the backend server and displays:
 * - API requests in real-time
 * - WebSocket connections
 * - Booking events
 * - Driver location updates
 * - Error tracking
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3010';
const WS_URL = 'ws://localhost:3010';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${title}${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

async function checkServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    log('✅ Backend Server: HEALTHY', colors.green);
    log(`   Uptime: ${Math.floor(response.data.uptime / 60)} minutes`, colors.cyan);
    log(`   Environment: ${response.data.environment}`, colors.cyan);
    return true;
  } catch (error) {
    log('❌ Backend Server: DOWN', colors.red);
    log(`   Error: ${error.message}`, colors.red);
    return false;
  }
}

function setupWebSocketMonitoring() {
  logSection('🔌 WebSocket Monitoring');

  const socket = io(WS_URL, {
    transports: ['websocket'],
    reconnection: true
  });

  socket.on('connect', () => {
    log('✅ WebSocket Connected', colors.green);

    // Register as monitor
    socket.emit('register', {
      userId: 'monitor',
      userType: 'rider'
    });
  });

  socket.on('disconnect', () => {
    log('❌ WebSocket Disconnected', colors.red);
  });

  socket.on('error', (error) => {
    log(`❌ WebSocket Error: ${error}`, colors.red);
  });

  // Listen for all events
  socket.on('ride_request', (data) => {
    log('📨 RIDE REQUEST EVENT', colors.magenta);
    log(`   Booking ID: ${data.bookingId}`, colors.cyan);
    log(`   Driver ID: ${data.driverId || 'N/A'}`, colors.cyan);
    log(`   Expires in: ${data.expiresIn}s`, colors.yellow);
  });

  socket.on('ride_matched', (data) => {
    log('✅ RIDE MATCHED EVENT', colors.green);
    log(`   Booking ID: ${data.bookingId}`, colors.cyan);
    log(`   Rider ID: ${data.riderId}`, colors.cyan);
    log(`   Driver ID: ${data.driverId}`, colors.cyan);
  });

  socket.on('ride_started', (data) => {
    log('🚀 RIDE STARTED EVENT', colors.green);
    log(`   Booking ID: ${data.bookingId}`, colors.cyan);
    log(`   Start Time: ${data.startTime}`, colors.cyan);
  });

  socket.on('ride_completed', (data) => {
    log('🏁 RIDE COMPLETED EVENT', colors.green);
    log(`   Booking ID: ${data.bookingId}`, colors.cyan);
  });

  socket.on('ride_cancelled', (data) => {
    log('❌ RIDE CANCELLED EVENT', colors.yellow);
    log(`   Booking ID: ${data.bookingId}`, colors.cyan);
    log(`   Cancelled By: ${data.cancelledBy}`, colors.cyan);
    log(`   Reason: ${data.reason || 'N/A'}`, colors.cyan);
  });

  socket.on('captain_location', (data) => {
    log('📍 CAPTAIN LOCATION UPDATE', colors.blue);
    log(`   Driver ID: ${data.driverId}`, colors.cyan);
    log(`   Location: ${data.location.latitude}, ${data.location.longitude}`, colors.cyan);
  });

  socket.on('registered', (data) => {
    log('✅ Client Registered on WebSocket', colors.green);
    log(`   User ID: ${data.userId}`, colors.cyan);
  });

  return socket;
}

async function monitorAPIEndpoints() {
  logSection('📊 API Endpoints Status');

  const endpoints = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'API Info', url: '/', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.url}`
      });
      log(`✅ ${endpoint.name}: ${response.status}`, colors.green);
    } catch (error) {
      log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'}`, colors.red);
    }
  }
}

function displayTestAccounts() {
  logSection('👥 Test Accounts Available');

  console.log(`${colors.bright}Test Rider:${colors.reset}`);
  console.log(`  Phone: ${colors.cyan}+919999888877${colors.reset}`);
  console.log(`  User ID: ${colors.cyan}69600147c9d5810295bb4971${colors.reset}`);
  console.log(`  Name: Test Rider\n`);

  console.log(`${colors.bright}Test Driver:${colors.reset}`);
  console.log(`  Phone: ${colors.cyan}+919999777766${colors.reset}`);
  console.log(`  Driver ID: ${colors.cyan}69600158c9d5810295bb4974${colors.reset}`);
  console.log(`  Name: Test Driver\n`);
}

function displayIntegrationStatus() {
  logSection('📱 Mobile Team Integration Status');

  console.log(`${colors.bright}SitaRamApp (Rider):${colors.reset}`);
  console.log(`  Status: ${colors.yellow}⏳ Waiting for integration${colors.reset}`);
  console.log(`  Expected calls: User registration, Booking creation`);
  console.log();

  console.log(`${colors.bright}LakshmanApp (Captain):${colors.reset}`);
  console.log(`  Status: ${colors.yellow}⏳ Waiting for integration${colors.reset}`);
  console.log(`  Expected calls: Driver registration, Location updates`);
  console.log();
}

async function main() {
  console.clear();

  logSection('🚀 Backend API Monitor - MOBILE TEAM SUPPORT');

  console.log(`${colors.bright}Backend URL:${colors.reset} ${colors.cyan}${BASE_URL}${colors.reset}`);
  console.log(`${colors.bright}WebSocket URL:${colors.reset} ${colors.cyan}${WS_URL}${colors.reset}`);
  console.log(`${colors.bright}API Docs:${colors.reset} ${colors.cyan}${BASE_URL}/api/docs${colors.reset}`);
  console.log();

  // Check server health
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    log('❌ Backend server is not responding. Please start it first.', colors.red);
    process.exit(1);
  }

  // Monitor API endpoints
  await monitorAPIEndpoints();

  // Display test accounts
  displayTestAccounts();

  // Display integration status
  displayIntegrationStatus();

  // Setup WebSocket monitoring
  const socket = setupWebSocketMonitoring();

  logSection('👂 Listening for Mobile App Requests...');
  log('Monitoring backend for incoming API calls from mobile apps', colors.cyan);
  log('Press Ctrl+C to stop monitoring', colors.yellow);
  console.log();

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n');
    log('Stopping monitor...', colors.yellow);
    socket.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
