import { Injectable } from '@nestjs/common';

/**
 * Service Area Management
 *
 * Manages multiple service areas with:
 * - Geographic boundaries
 * - Area-specific fare configurations
 * - Popular destinations per area
 * - Launch schedule
 */

interface ServiceArea {
  id: string;
  name: string;
  nameHi: string;
  city: string;
  state: string;

  // Geographic center
  center: {
    lat: number;
    lng: number;
  };

  // Service radius in km
  radiusKm: number;

  // Status
  status: 'active' | 'planned' | 'paused';
  launchDate?: Date;

  // Area-specific configuration
  fareConfig?: {
    baseFare?: number;
    perKm?: number;
    perMinute?: number;
    minimumFare?: number;
  };

  // Operational
  maxCaptains?: number; // Soft limit for planning
  priority: number; // For expansion priority (1 = highest)

  // Display
  displayOrder: number;
  marketingMessage?: string;
  marketingMessageHi?: string;
}

@Injectable()
export class ServiceAreaService {

  /**
   * All service areas - expandable configuration
   */
  private readonly SERVICE_AREAS: ServiceArea[] = [
    // ============ PHASE 1: PARI CHOWK (ACTIVE) ============
    {
      id: 'pari-chowk',
      name: 'Pari Chowk',
      nameHi: 'परी चौक',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      center: { lat: 28.4744, lng: 77.4920 },
      radiusKm: 5,
      status: 'active',
      launchDate: new Date('2026-01-13'),
      fareConfig: {
        baseFare: 15,
        perKm: 7,
        perMinute: 1,
        minimumFare: 20
      },
      maxCaptains: 100,
      priority: 1,
      displayOrder: 1,
      marketingMessage: 'Now serving Pari Chowk area - Zero commission!',
      marketingMessageHi: 'अब Pari Chowk में उपलब्ध - Zero commission!'
    },

    // ============ PHASE 2: EXPANSION AREAS (PLANNED) ============
    {
      id: 'knowledge-park',
      name: 'Knowledge Park',
      nameHi: 'नॉलेज पार्क',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      center: { lat: 28.4750, lng: 77.4850 },
      radiusKm: 6,
      status: 'planned',
      launchDate: new Date('2026-02-01'),
      fareConfig: {
        baseFare: 15,
        perKm: 7,
        perMinute: 1,
        minimumFare: 20
      },
      maxCaptains: 150,
      priority: 2,
      displayOrder: 2,
      marketingMessage: 'Coming soon to Knowledge Park!',
      marketingMessageHi: 'जल्द ही Knowledge Park में!'
    },

    {
      id: 'alpha-commercial-belt',
      name: 'Alpha Commercial Belt',
      nameHi: 'अल्फा कमर्शियल बेल्ट',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      center: { lat: 28.4760, lng: 77.5050 },
      radiusKm: 4,
      status: 'planned',
      launchDate: new Date('2026-02-15'),
      maxCaptains: 80,
      priority: 3,
      displayOrder: 3
    },

    {
      id: 'greater-noida-west',
      name: 'Greater Noida West',
      nameHi: 'ग्रेटर नोएडा वेस्ट',
      city: 'Greater Noida West',
      state: 'Uttar Pradesh',
      center: { lat: 28.4595, lng: 77.4330 },
      radiusKm: 8,
      status: 'planned',
      launchDate: new Date('2026-03-01'),
      maxCaptains: 200,
      priority: 4,
      displayOrder: 4
    },

    {
      id: 'noida-sector-62',
      name: 'Noida Sector 62',
      nameHi: 'नोएडा सेक्टर 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      center: { lat: 28.6260, lng: 77.3640 },
      radiusKm: 5,
      status: 'planned',
      launchDate: new Date('2026-04-01'),
      maxCaptains: 120,
      priority: 5,
      displayOrder: 5
    },

    // ============ PHASE 3: DELHI NCR EXPANSION ============
    {
      id: 'dwarka',
      name: 'Dwarka',
      nameHi: 'द्वारका',
      city: 'Delhi',
      state: 'Delhi',
      center: { lat: 28.5921, lng: 77.0460 },
      radiusKm: 7,
      status: 'planned',
      launchDate: new Date('2026-06-01'),
      maxCaptains: 250,
      priority: 10,
      displayOrder: 10
    }
  ];

  /**
   * Check if a location is within any active service area
   */
  isWithinServiceArea(lat: number, lng: number): {
    inServiceArea: boolean;
    area?: ServiceArea;
    distance?: number;
  } {
    // Check all active areas
    const activeAreas = this.SERVICE_AREAS.filter(area => area.status === 'active');

    for (const area of activeAreas) {
      const distance = this.calculateDistance(
        lat,
        lng,
        area.center.lat,
        area.center.lng
      );

      if (distance <= area.radiusKm) {
        return {
          inServiceArea: true,
          area,
          distance
        };
      }
    }

    return {
      inServiceArea: false
    };
  }

  /**
   * Get nearest service area (active or planned)
   */
  getNearestServiceArea(lat: number, lng: number): {
    area: ServiceArea;
    distance: number;
    isActive: boolean;
  } | null {
    let nearestArea: ServiceArea | null = null;
    let minDistance = Infinity;

    for (const area of this.SERVICE_AREAS) {
      const distance = this.calculateDistance(
        lat,
        lng,
        area.center.lat,
        area.center.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestArea = area;
      }
    }

    if (!nearestArea) return null;

    return {
      area: nearestArea,
      distance: minDistance,
      isActive: nearestArea.status === 'active'
    };
  }

  /**
   * Get all service areas (for display/planning)
   */
  getAllServiceAreas(statusFilter?: 'active' | 'planned' | 'paused'): ServiceArea[] {
    if (statusFilter) {
      return this.SERVICE_AREAS
        .filter(area => area.status === statusFilter)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return this.SERVICE_AREAS.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get service area by ID
   */
  getServiceAreaById(id: string): ServiceArea | undefined {
    return this.SERVICE_AREAS.find(area => area.id === id);
  }

  /**
   * Get active service areas
   */
  getActiveServiceAreas(): ServiceArea[] {
    return this.SERVICE_AREAS
      .filter(area => area.status === 'active')
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get planned service areas (coming soon)
   */
  getPlannedServiceAreas(): ServiceArea[] {
    return this.SERVICE_AREAS
      .filter(area => area.status === 'planned')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Validate ride locations (pickup & drop in same or overlapping service areas)
   */
  validateRideLocations(
    pickup: { lat: number; lng: number },
    drop: { lat: number; lng: number }
  ): {
    valid: boolean;
    message: string;
    messageHi: string;
    pickupArea?: ServiceArea;
    dropArea?: ServiceArea;
  } {
    // Check pickup location
    const pickupCheck = this.isWithinServiceArea(pickup.lat, pickup.lng);

    if (!pickupCheck.inServiceArea) {
      const nearest = this.getNearestServiceArea(pickup.lat, pickup.lng);

      return {
        valid: false,
        message: `Pickup location outside service area. Nearest: ${nearest?.area.name} (${Math.round(nearest?.distance || 0)} km away)`,
        messageHi: `Pickup location service area के बाहर है। Nearest: ${nearest?.area.nameHi} (${Math.round(nearest?.distance || 0)} km दूर)`
      };
    }

    // Check drop location
    const dropCheck = this.isWithinServiceArea(drop.lat, drop.lng);

    if (!dropCheck.inServiceArea) {
      return {
        valid: false,
        message: `Drop location outside service area. We currently serve ${pickupCheck.area?.name} (${pickupCheck.area?.radiusKm} km radius)`,
        messageHi: `Drop location service area के बाहर है। हम currently ${pickupCheck.area?.nameHi} में serve करते हैं (${pickupCheck.area?.radiusKm} km radius)`
      };
    }

    return {
      valid: true,
      message: 'Both locations are within service area',
      messageHi: 'दोनों locations service area में हैं',
      pickupArea: pickupCheck.area,
      dropArea: dropCheck.area
    };
  }

  /**
   * Get expansion roadmap (for marketing/info)
   */
  getExpansionRoadmap(): {
    current: ServiceArea[];
    comingSoon: ServiceArea[];
    future: ServiceArea[];
  } {
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      current: this.SERVICE_AREAS.filter(area => area.status === 'active'),
      comingSoon: this.SERVICE_AREAS.filter(
        area => area.status === 'planned' &&
                area.launchDate &&
                area.launchDate <= next30Days
      ),
      future: this.SERVICE_AREAS.filter(
        area => area.status === 'planned' &&
                (!area.launchDate || area.launchDate > next30Days)
      ).slice(0, 5) // Top 5 future areas
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km

    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate estimated time between two locations
   */
  calculateEstimatedTime(distanceKm: number, avgSpeedKmh: number = 25): number {
    // Account for traffic and stops
    const timeHours = distanceKm / avgSpeedKmh;
    const timeMinutes = timeHours * 60;

    // Add buffer time (traffic lights, turns, etc.)
    const bufferMinutes = Math.ceil(distanceKm * 0.5); // ~30 sec per km for stops

    return Math.ceil(timeMinutes + bufferMinutes);
  }

  /**
   * Get fare configuration for a specific area
   */
  getFareConfigForArea(areaId: string): {
    baseFare: number;
    perKm: number;
    perMinute: number;
    minimumFare: number;
  } {
    const area = this.getServiceAreaById(areaId);

    if (!area || !area.fareConfig) {
      // Default configuration
      return {
        baseFare: 15,
        perKm: 7,
        perMinute: 1,
        minimumFare: 20
      };
    }

    return {
      baseFare: area.fareConfig.baseFare || 15,
      perKm: area.fareConfig.perKm || 7,
      perMinute: area.fareConfig.perMinute || 1,
      minimumFare: area.fareConfig.minimumFare || 20
    };
  }
}
