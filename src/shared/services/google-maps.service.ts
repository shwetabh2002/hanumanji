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

  /**
   * Search places using Google Places Autocomplete API
   * Backend-Heavy: Protects API key, enables caching
   */
  async searchPlaces(query: string): Promise<any[]> {
    if (!this.apiKey) {
      this.logger.error('❌ Cannot search places: Google Maps API key not configured');
      return [];
    }

    try {
      const url = `${this.baseUrl}/place/autocomplete/json`;

      const params = {
        input: query,
        key: this.apiKey,
      };

      this.logger.log(`🔍 Searching places: "${query}"`);

      const response = await axios.get(url, {
        params,
        timeout: 5000,
      });

      if (response.data.status === 'ZERO_RESULTS') {
        this.logger.log(`⚠️ No results found for: "${query}"`);
        return [];
      }

      if (response.data.status !== 'OK') {
        this.logger.error(`❌ Places Autocomplete API error: ${response.data.status}`);
        return [];
      }

      this.logger.log(`✅ Found ${response.data.predictions.length} places`);

      return response.data.predictions;
    } catch (error) {
      this.logger.error('❌ Failed to search places:', error.message);
      return [];
    }
  }

  /**
   * Get place details using Google Place Details API
   * Backend-Heavy: Protects API key, enables caching
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    if (!this.apiKey) {
      this.logger.error('❌ Cannot get place details: Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = `${this.baseUrl}/place/details/json`;

      const params = {
        place_id: placeId,
        key: this.apiKey,
      };

      this.logger.log(`📍 Getting place details: ${placeId}`);

      const response = await axios.get(url, {
        params,
        timeout: 5000,
      });

      if (response.data.status !== 'OK') {
        this.logger.error(`❌ Place Details API error: ${response.data.status}`);
        throw new Error(`Place Details API error: ${response.data.status}`);
      }

      this.logger.log(`✅ Place details retrieved: ${response.data.result.name}`);

      return response.data.result;
    } catch (error) {
      this.logger.error('❌ Failed to get place details:', error.message);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   * Backend-Heavy: Protects API key, enables caching
   */
  async reverseGeocode(lat: number, lng: number): Promise<any> {
    if (!this.apiKey) {
      this.logger.error('❌ Cannot reverse geocode: Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = `${this.baseUrl}/geocode/json`;

      const params = {
        latlng: `${lat},${lng}`,
        key: this.apiKey,
      };

      this.logger.log(`📍 Reverse geocoding: ${lat}, ${lng}`);

      const response = await axios.get(url, {
        params,
        timeout: 5000,
      });

      if (response.data.status !== 'OK') {
        this.logger.error(`❌ Geocoding API error: ${response.data.status}`);
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const result = response.data.results[0];

      this.logger.log(`✅ Address retrieved: ${result.formatted_address}`);

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to reverse geocode:', error.message);
      throw error;
    }
  }
}
