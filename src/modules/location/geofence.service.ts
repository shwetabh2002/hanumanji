import { Injectable } from '@nestjs/common';

/**
 * Geofencing Service
 *
 * Validates if locations are within the service area.
 * Phase 1: Pari Chowk, Greater Noida (5km radius)
 * Future: Expand to multiple cities with polygon geofences
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ServiceArea {
  name: string;
  nameHi: string;
  center: Coordinates;
  radiusKm: number;
  active: boolean;
}

@Injectable()
export class GeofenceService {

  // Service areas configuration
  private readonly SERVICE_AREAS: ServiceArea[] = [
    {
      name: 'Pari Chowk, Greater Noida',
      nameHi: 'परी चौक, ग्रेटर नोएडा',
      center: { lat: 28.4744, lng: 77.4920 },  // Pari Chowk roundabout
      radiusKm: 5,
      active: true
    }
    // Future: Add more service areas
    // { name: 'Knowledge Park', center: { lat: ..., lng: ... }, radiusKm: 3, active: true }
  ];

  /**
   * Check if coordinates are within any active service area
   */
  isWithinServiceArea(lat: number, lng: number): {
    inServiceArea: boolean;
    area?: ServiceArea;
    distance?: number;
  } {
    for (const area of this.SERVICE_AREAS) {
      if (!area.active) continue;

      const distance = this.calculateDistance(
        area.center.lat,
        area.center.lng,
        lat,
        lng
      );

      if (distance <= area.radiusKm) {
        return {
          inServiceArea: true,
          area,
          distance
        };
      }
    }

    return { inServiceArea: false };
  }

  /**
   * Get the nearest service area
   */
  getNearestServiceArea(lat: number, lng: number): {
    area: ServiceArea;
    distance: number;
  } | null {
    let nearest = null;
    let minDistance = Infinity;

    for (const area of this.SERVICE_AREAS) {
      if (!area.active) continue;

      const distance = this.calculateDistance(
        area.center.lat,
        area.center.lng,
        lat,
        lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = area;
      }
    }

    return nearest ? { area: nearest, distance: minDistance } : null;
  }

  /**
   * Get all active service areas
   */
  getActiveServiceAreas(): ServiceArea[] {
    return this.SERVICE_AREAS.filter(area => area.active);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate estimated time based on distance
   * Assumes average speed of 25 km/h for bikes in traffic
   */
  calculateEstimatedTime(distanceKm: number): number {
    const AVERAGE_SPEED_KMH = 25;
    const timeHours = distanceKm / AVERAGE_SPEED_KMH;
    const timeMinutes = Math.ceil(timeHours * 60);

    return timeMinutes;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate if both pickup and drop are within service area
   */
  validateRideLocations(
    pickup: Coordinates,
    drop: Coordinates
  ): {
    valid: boolean;
    pickupInArea: boolean;
    dropInArea: boolean;
    message?: string;
    messageHi?: string;
  } {
    const pickupCheck = this.isWithinServiceArea(pickup.lat, pickup.lng);
    const dropCheck = this.isWithinServiceArea(drop.lat, drop.lng);

    if (!pickupCheck.inServiceArea) {
      return {
        valid: false,
        pickupInArea: false,
        dropInArea: dropCheck.inServiceArea,
        message: 'Pickup location is outside service area. We currently serve Pari Chowk area (5km radius).',
        messageHi: 'Pickup location service area से बाहर है। हम currently Pari Chowk area (5km radius) में serve करते हैं।'
      };
    }

    if (!dropCheck.inServiceArea) {
      return {
        valid: false,
        pickupInArea: true,
        dropInArea: false,
        message: 'Drop location is outside service area. We currently serve Pari Chowk area (5km radius).',
        messageHi: 'Drop location service area से बाहर है। हम currently Pari Chowk area (5km radius) में serve करते हैं।'
      };
    }

    return {
      valid: true,
      pickupInArea: true,
      dropInArea: true,
      message: 'Both locations are within service area',
      messageHi: 'दोनों locations service area में हैं'
    };
  }
}
