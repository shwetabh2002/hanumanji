import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GeocodingResult {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  displayName: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    try {
      this.logger.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
      
      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
        },
        headers: {
          'User-Agent': 'Rapido-Clone-Backend/1.0.0',
        },
        timeout: 5000, // 5 second timeout
      });

      const data = response.data;
      const address = data.address;

      if (!address) {
        throw new Error('No address found for the given coordinates');
      }

      const result: GeocodingResult = {
        street: address.residential || address.road || address.county || 'Unknown',
        city: address.city || address.town || address.village || address.county || 'Unknown',
        state: address.state || address.province || 'Unknown',
        country: address.country || 'Unknown',
        zipCode: address.postcode || '000000',
        displayName: data.display_name || 'Unknown location',
      };

      this.logger.log(`Successfully geocoded to: ${result.displayName}`);
      return result;

    } catch (error) {
      this.logger.error(`Reverse geocoding failed: ${error.message}`);
      
      // Return fallback data instead of throwing
      return {
        street: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        zipCode: '000000',
        displayName: `Location at ${latitude}, ${longitude}`,
      };
    }
  }

  async forwardGeocode(address: string): Promise<GeocodingResult[]> {
    try {
      this.logger.log(`Forward geocoding address: ${address}`);
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: address,
          format: 'json',
          limit: 5,
        },
        headers: {
          'User-Agent': 'Rapido-Clone-Backend/1.0.0',
        },
        timeout: 5000,
      });

      const results = response.data.map((data: any) => ({
        street: data.address?.residential || data.address?.road || data.address?.county || 'Unknown',
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown',
        state: data.address?.state || data.address?.province || 'Unknown',
        country: data.address?.country || 'Unknown',
        zipCode: data.address?.postcode || '000000',
        displayName: data.display_name || 'Unknown location',
      }));

      this.logger.log(`Found ${results.length} geocoding results`);
      return results;

    } catch (error) {
      this.logger.error(`Forward geocoding failed: ${error.message}`);
      return [];
    }
  }
} 