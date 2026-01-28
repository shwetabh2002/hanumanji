/**
 * Add Test Drivers to Redis
 *
 * Creates mock drivers around Pari Chowk for testing map booking screen
 * Simple Node.js script using ioredis (already installed in backend)
 */

const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
  keyPrefix: 'rideit:',
});

const CAPTAINS_ONLINE_KEY = 'captains:online';
const CAPTAIN_METADATA_PREFIX = 'captain:meta:';

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
  try {
    console.log('Connected to Redis\n');

    // Add each driver
    for (const driver of TEST_DRIVERS) {
      console.log(`Adding driver: ${driver.id} (${driver.name})`);

      // Add to geospatial index (GEOADD)
      await redis.geoadd(
        CAPTAINS_ONLINE_KEY,
        driver.lng,
        driver.lat,
        driver.id
      );

      // Add metadata (HSET)
      const metadataKey = `${CAPTAIN_METADATA_PREFIX}${driver.id}`;
      await redis.hmset(metadataKey, {
        heading: String(driver.heading),
        speed: String(driver.speed),
        timestamp: new Date().toISOString(),
        lat: String(driver.lat),
        lng: String(driver.lng),
        busy: '0', // Not busy (available)
      });

      // Set TTL on metadata (expire after 5 minutes)
      await redis.expire(metadataKey, 300);

      console.log(`  ✅ Added at (${driver.lat}, ${driver.lng})`);
      console.log(`  Heading: ${driver.heading}°, Speed: ${driver.speed} km/h\n`);
    }

    console.log('\n🎉 All test drivers added successfully!\n');

    // Verify drivers
    console.log('Verifying drivers near Pari Chowk...');
    const nearby = await redis.georadius(
      CAPTAINS_ONLINE_KEY,
      PARI_CHOWK.lng,
      PARI_CHOWK.lat,
      5,
      'km',
      'WITHDIST'
    );

    console.log(`\nFound ${nearby.length / 2} drivers within 5km:`);
    for (let i = 0; i < nearby.length; i += 2) {
      const driverId = nearby[i];
      const distance = nearby[i + 1];
      console.log(`  - ${driverId}: ${parseFloat(distance).toFixed(2)} km away`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await redis.quit();
    console.log('\n✅ Disconnected from Redis');
  }
}

// Run the script
addTestDrivers().catch(console.error);
