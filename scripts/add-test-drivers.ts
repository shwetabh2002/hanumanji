/**
 * Add Test Drivers to Redis
 *
 * Creates mock drivers around Pari Chowk for testing map booking screen
 * Adds drivers to Redis GEORADIUS index for real-time location queries
 */

import { createClient } from 'redis';

const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
  db: 0,
};

const CAPTAINS_ONLINE_KEY = 'rideit:captains:online';
const CAPTAIN_METADATA_PREFIX = 'rideit:captain:meta:';

// Pari Chowk center coordinates
const PARI_CHOWK = {
  lat: 28.4744,
  lng: 77.4920,
};

// Test drivers around Pari Chowk (within 2km radius)
const TEST_DRIVERS = [
  {
    id: 'driver_test_001',
    name: 'Rajesh Kumar',
    lat: 28.4760,
    lng: 77.4935,
    heading: 45,
    speed: 15,
  },
  {
    id: 'driver_test_002',
    name: 'Amit Singh',
    lat: 28.4730,
    lng: 77.4905,
    heading: 90,
    speed: 20,
  },
  {
    id: 'driver_test_003',
    name: 'Vijay Sharma',
    lat: 28.4755,
    lng: 77.4950,
    heading: 180,
    speed: 10,
  },
  {
    id: 'driver_test_004',
    name: 'Suresh Verma',
    lat: 28.4720,
    lng: 77.4890,
    heading: 270,
    speed: 25,
  },
  {
    id: 'driver_test_005',
    name: 'Ravi Gupta',
    lat: 28.4770,
    lng: 77.4960,
    heading: 135,
    speed: 18,
  },
];

async function addTestDrivers() {
  const client = createClient({
    socket: {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
    },
    database: REDIS_CONFIG.db,
  });

  try {
    console.log('Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Add each driver
    for (const driver of TEST_DRIVERS) {
      console.log(`Adding driver: ${driver.id} (${driver.name})`);

      // Add to geospatial index
      await client.geoAdd(
        CAPTAINS_ONLINE_KEY,
        {
          longitude: driver.lng,
          latitude: driver.lat,
          member: driver.id,
        }
      );

      // Add metadata
      const metadataKey = `${CAPTAIN_METADATA_PREFIX}${driver.id}`;
      await client.hSet(metadataKey, {
        heading: String(driver.heading),
        speed: String(driver.speed),
        timestamp: new Date().toISOString(),
        lat: String(driver.lat),
        lng: String(driver.lng),
        busy: '0', // Not busy (available)
      });

      // Set TTL on metadata (expire after 5 minutes)
      await client.expire(metadataKey, 300);

      console.log(`  ✅ Added at (${driver.lat}, ${driver.lng})`);
      console.log(`  Heading: ${driver.heading}°, Speed: ${driver.speed} km/h\n`);
    }

    console.log('\n🎉 All test drivers added successfully!\n');

    // Verify drivers
    console.log('Verifying drivers near Pari Chowk...');
    const nearby = await client.geoRadius(
      CAPTAINS_ONLINE_KEY,
      {
        longitude: PARI_CHOWK.lng,
        latitude: PARI_CHOWK.lat,
      },
      5,
      'km',
      {
        WITHDIST: true,
        COUNT: 10,
      }
    );

    console.log(`\nFound ${nearby.length} drivers within 5km:`);
    nearby.forEach((driver: any) => {
      console.log(`  - ${driver.member}: ${driver.distance.toFixed(2)} km away`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('\n✅ Disconnected from Redis');
  }
}

// Run the script
addTestDrivers().catch(console.error);
