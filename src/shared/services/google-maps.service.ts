import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Google Maps Service
 *
 * Handles Google Maps API interactions:
 * - Directions API for route polylines
 * - Distance Matrix for accurate ETAs (future)
 */

interface DirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string; // Encoded polyline
    };
    legs: Array<{
      distance: {
        text: string;
        value: number; // meters
      };
      duration: {
        text: string;
        value: number; // seconds
      };
    }>;
  }>;
  status: string;
}

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured. Directions API will not work.');
    }
  }

  /**
   * Get route polyline between two points
   * Uses Google Directions API
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<{
    polyline: string;
    distance: number; // meters
    duration: number; // seconds
  } | null> {
    if (!this.apiKey) {
      this.logger.error('❌ Cannot fetch directions: Google Maps API key not configured');
      return null;
    }

    try {
      const url = `${this.baseUrl}/directions/json`;

      const params = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: this.apiKey,
        mode: 'driving',
      };

      this.logger.log(`🗺️ Fetching directions from Google Maps: ${params.origin} -> ${params.destination}`);
      const startTime = Date.now();

      const response = await axios.get<DirectionsResponse>(url, {
        params,
        timeout: 5000, // 5 second timeout
      });

      const duration = Date.now() - startTime;

      if (response.data.status !== 'OK') {
        this.logger.error(`❌ Google Directions API error: ${response.data.status}`);
        return null;
      }

      const route = response.data.routes[0];
      if (!route) {
        this.logger.error('❌ No route found in Google Maps response');
        return null;
      }

      const leg = route.legs[0];

      this.logger.log(`✅ Directions fetched successfully in ${duration}ms:`, {
        distance: `${(leg.distance.value / 1000).toFixed(2)} km`,
        duration: `${Math.round(leg.duration.value / 60)} min`,
        polylineLength: route.overview_polyline.points.length,
      });

      return {
        polyline: route.overview_polyline.points,
        distance: leg.distance.value, // meters
        duration: leg.duration.value, // seconds
      };

    } catch (error) {
      this.logger.error('❌ Failed to fetch directions from Google Maps:', {
        error: error.message,
        origin,
        destination,
      });
      return null;
    }
  }

  /**
   * Decode polyline (if needed on backend)
   * Usually we send encoded polyline to mobile and decode there
   */
  decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    const poly: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        lat: lat / 1e5,
        lng: lng / 1e5,
      });
    }

    return poly;
  }
}
