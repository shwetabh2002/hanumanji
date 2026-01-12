import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleType } from '../../../common/enums';

export interface FareConfig {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
}

export interface FareEstimate {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  discount: number;
  tax: number;
  totalFare: number;
  estimatedDistance: number; // meters
  estimatedDuration: number; // seconds
}

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);

  // Fare configurations per vehicle type (in INR)
  private readonly fareConfig: Record<VehicleType, FareConfig> = {
    [VehicleType.BIKE]: {
      baseFare: 15,
      perKmRate: 8,
      perMinuteRate: 1,
      minimumFare: 25,
    },
    [VehicleType.AUTO]: {
      baseFare: 25,
      perKmRate: 12,
      perMinuteRate: 1.5,
      minimumFare: 40,
    },
    [VehicleType.CAB]: {
      baseFare: 50,
      perKmRate: 15,
      perMinuteRate: 2,
      minimumFare: 80,
    },
  };

  private readonly taxRate = 0.05; // 5% GST

  constructor(private readonly configService: ConfigService) {}

  /**
   * Calculate fare estimate based on distance and duration
   */
  calculateFare(
    vehicleType: VehicleType,
    distanceMeters: number,
    durationSeconds: number,
    surgeMultiplier: number = 1,
    discountAmount: number = 0,
  ): FareEstimate {
    const config = this.fareConfig[vehicleType];
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;

    const baseFare = config.baseFare;
    const distanceFare = Math.round(distanceKm * config.perKmRate);
    const timeFare = Math.round(durationMinutes * config.perMinuteRate);

    let subtotal = baseFare + distanceFare + timeFare;
    
    // Apply surge
    subtotal = Math.round(subtotal * surgeMultiplier);
    
    // Apply discount
    const discount = Math.min(discountAmount, subtotal * 0.5); // Max 50% discount
    subtotal = subtotal - discount;

    // Ensure minimum fare
    subtotal = Math.max(subtotal, config.minimumFare);

    // Calculate tax
    const tax = Math.round(subtotal * this.taxRate);
    const totalFare = subtotal + tax;

    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier,
      discount,
      tax,
      totalFare,
      estimatedDistance: distanceMeters,
      estimatedDuration: durationSeconds,
    };
  }

  /**
   * Calculate surge multiplier based on demand/supply ratio
   * This would be more sophisticated in production
   */
  async calculateSurge(
    latitude: number,
    longitude: number,
    vehicleType: VehicleType,
  ): Promise<number> {
    // In production, this would:
    // 1. Get count of active bookings in area
    // 2. Get count of available drivers in area
    // 3. Calculate demand/supply ratio
    // 4. Apply surge formula
    
    // For now, return base multiplier
    return 1.0;
  }

  /**
   * Estimate distance and duration between two points
   * In production, use Google Maps Distance Matrix API
   */
  estimateDistanceAndDuration(
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
  ): { distanceMeters: number; durationSeconds: number } {
    // Haversine formula for straight-line distance
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(dropLat - pickupLat);
    const dLon = this.toRad(dropLng - pickupLng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(pickupLat)) *
        Math.cos(this.toRad(dropLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineDistance = R * c;

    // Road distance is typically 1.3x straight line
    const roadDistance = Math.round(straightLineDistance * 1.3);
    
    // Estimate duration: average speed 25 km/h in city
    const avgSpeedMps = 25000 / 3600; // meters per second
    const duration = Math.round(roadDistance / avgSpeedMps);

    return {
      distanceMeters: roadDistance,
      durationSeconds: duration,
    };
  }

  /**
   * Calculate final fare after ride completion
   */
  calculateFinalFare(
    vehicleType: VehicleType,
    actualDistanceMeters: number,
    actualDurationSeconds: number,
    surgeMultiplier: number = 1,
    discountAmount: number = 0,
  ): FareEstimate {
    return this.calculateFare(
      vehicleType,
      actualDistanceMeters,
      actualDurationSeconds,
      surgeMultiplier,
      discountAmount,
    );
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

