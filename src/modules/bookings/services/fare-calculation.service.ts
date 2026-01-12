import { Injectable } from '@nestjs/common';

/**
 * Fare Calculation Service
 *
 * Handles all fare calculations for Greater Noida (Pari Chowk) operations
 * Backend-heavy: ALL fare logic lives here - mobile apps just display results
 */

interface FareConfig {
  phaseName: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  commissionRate: number; // 0.0 = 0%, 0.13 = 13%
  surgeMultiplier: number; // 1.0 = no surge
  studentDiscount?: {
    enabled: boolean;
    discountPercent: number;
    maxDiscount: number;
  };
}

interface FareBreakdown {
  riderPays: number;
  captainEarns: number;
  commission: number;
  breakdown: {
    base: number;
    distance: number;
    time: number;
    surge: number;
    discount: number;
  };
  comparison: {
    rapidoEstimate: number;
    youSave: number;
    percentSaved: number;
  };
  displayText: {
    fare: string;
    savings: string;
    eta: string;
    captainEarns: string;
  };
  displayTextHi: {
    fare: string;
    savings: string;
    eta: string;
    captainEarns: string;
  };
}

@Injectable()
export class FareCalculationService {

  /**
   * Greater Noida Fare Configuration
   * Phase-based pricing strategy
   */
  private readonly FARE_PHASES = {
    PHASE_1: {
      phaseName: 'Pari Chowk Launch Phase - Zero Commission',
      baseFare: 15,
      perKm: 7,
      perMinute: 1,
      minimumFare: 20,
      commissionRate: 0, // 0% commission!
      surgeMultiplier: 1.0, // No surge
      studentDiscount: {
        enabled: true,
        discountPercent: 10,
        maxDiscount: 10
      }
    },
    PHASE_2: {
      phaseName: 'Growth Phase - Low Commission',
      baseFare: 15,
      perKm: 7.5,
      perMinute: 1,
      minimumFare: 25,
      commissionRate: 0.13, // 13% commission
      surgeMultiplier: 1.0,
      studentDiscount: {
        enabled: true,
        discountPercent: 5,
        maxDiscount: 10
      }
    },
    PHASE_3: {
      phaseName: 'Sustainable Phase - Standard Commission',
      baseFare: 15,
      perKm: 8,
      perMinute: 1.5,
      minimumFare: 30,
      commissionRate: 0.15, // 15% commission
      surgeMultiplier: 1.0,
      studentDiscount: {
        enabled: false,
        discountPercent: 0,
        maxDiscount: 0
      }
    }
  };

  // Current active phase (can be changed via environment variable or database)
  private readonly CURRENT_PHASE = 'PHASE_1';

  /**
   * Calculate fare for a ride
   *
   * @param distanceKm Distance in kilometers
   * @param estimatedTimeMin Estimated time in minutes
   * @param userType 'student' or 'regular' (for discounts)
   * @returns Complete fare breakdown
   */
  calculateFare(
    distanceKm: number,
    estimatedTimeMin: number,
    userType: 'student' | 'regular' = 'regular'
  ): FareBreakdown {
    const config = this.getCurrentConfig();

    // Base calculation
    let baseFareAmount = config.baseFare;
    let distanceFare = distanceKm * config.perKm;
    let timeFare = estimatedTimeMin * config.perMinute;

    let subtotal = baseFareAmount + distanceFare + timeFare;

    // Apply minimum fare
    subtotal = Math.max(subtotal, config.minimumFare);

    // Apply surge (if any)
    const surgeFare = subtotal * (config.surgeMultiplier - 1);
    subtotal = subtotal * config.surgeMultiplier;

    // Apply student discount
    let discount = 0;
    if (
      userType === 'student' &&
      config.studentDiscount &&
      config.studentDiscount.enabled
    ) {
      discount = Math.min(
        subtotal * (config.studentDiscount.discountPercent / 100),
        config.studentDiscount.maxDiscount
      );
      subtotal -= discount;
    }

    // Final rider payment (rounded)
    const riderPays = Math.round(subtotal);

    // Calculate commission and captain earnings
    const commission = Math.round(riderPays * config.commissionRate);
    const captainEarns = riderPays - commission;

    // Estimate Rapido pricing for comparison
    const rapidoEstimate = this.estimateRapidoFare(distanceKm, estimatedTimeMin);
    const youSave = rapidoEstimate - riderPays;
    const percentSaved = Math.round((youSave / rapidoEstimate) * 100);

    return {
      riderPays,
      captainEarns,
      commission,
      breakdown: {
        base: baseFareAmount,
        distance: Math.round(distanceFare),
        time: Math.round(timeFare),
        surge: Math.round(surgeFare),
        discount: Math.round(discount)
      },
      comparison: {
        rapidoEstimate,
        youSave,
        percentSaved
      },
      displayText: {
        fare: `₹${riderPays}`,
        savings: `Save ₹${youSave} vs Rapido`,
        eta: `${estimatedTimeMin} min`,
        captainEarns: `Captain earns ₹${captainEarns}`
      },
      displayTextHi: {
        fare: `₹${riderPays}`,
        savings: `Rapido से ₹${youSave} बचाएं`,
        eta: `${estimatedTimeMin} मिनट`,
        captainEarns: `Captain ₹${captainEarns} कमाएगा`
      }
    };
  }

  /**
   * Get current fare configuration
   */
  private getCurrentConfig(): FareConfig {
    return this.FARE_PHASES[this.CURRENT_PHASE];
  }

  /**
   * Estimate Rapido fare for comparison
   * Based on Rapido's pricing in Greater Noida:
   * Base: ₹25, Per KM: ₹9, Per Min: ₹2
   */
  private estimateRapidoFare(distanceKm: number, estimatedTimeMin: number): number {
    const RAPIDO_BASE = 25;
    const RAPIDO_PER_KM = 9;
    const RAPIDO_PER_MIN = 2;

    let fare = RAPIDO_BASE + (distanceKm * RAPIDO_PER_KM) + (estimatedTimeMin * RAPIDO_PER_MIN);
    fare = Math.max(fare, 40); // Rapido minimum fare

    return Math.round(fare);
  }

  /**
   * Calculate fare between two popular destinations
   * Uses pre-calculated average values for faster response
   */
  calculatePopularDestinationFare(
    averageFare: number,
    userType: 'student' | 'regular' = 'regular'
  ): FareBreakdown {
    // For popular destinations, we use pre-calculated average fare
    // and apply current phase pricing adjustments
    const config = this.getCurrentConfig();

    let fare = averageFare;

    // Apply student discount
    let discount = 0;
    if (
      userType === 'student' &&
      config.studentDiscount &&
      config.studentDiscount.enabled
    ) {
      discount = Math.min(
        fare * (config.studentDiscount.discountPercent / 100),
        config.studentDiscount.maxDiscount
      );
      fare -= discount;
    }

    const riderPays = Math.round(fare);
    const commission = Math.round(riderPays * config.commissionRate);
    const captainEarns = riderPays - commission;

    // Estimate comparison (assume 3km average for popular destinations)
    const rapidoEstimate = this.estimateRapidoFare(3, 8);
    const youSave = rapidoEstimate - riderPays;
    const percentSaved = Math.round((youSave / rapidoEstimate) * 100);

    return {
      riderPays,
      captainEarns,
      commission,
      breakdown: {
        base: config.baseFare,
        distance: Math.round(riderPays - config.baseFare - 3), // Approximate
        time: 3, // Approximate
        surge: 0,
        discount: Math.round(discount)
      },
      comparison: {
        rapidoEstimate,
        youSave,
        percentSaved
      },
      displayText: {
        fare: `₹${riderPays}`,
        savings: `Save ₹${youSave}`,
        eta: `~8 min`,
        captainEarns: `Earn ₹${captainEarns}`
      },
      displayTextHi: {
        fare: `₹${riderPays}`,
        savings: `₹${youSave} बचाएं`,
        eta: `~8 मिनट`,
        captainEarns: `₹${captainEarns} कमाएं`
      }
    };
  }

  /**
   * Get phase information
   */
  getCurrentPhaseInfo(): {
    phase: string;
    name: string;
    commissionRate: number;
    commissionDisplay: string;
    features: string[];
  } {
    const config = this.getCurrentConfig();

    return {
      phase: this.CURRENT_PHASE,
      name: config.phaseName,
      commissionRate: config.commissionRate,
      commissionDisplay: `${config.commissionRate * 100}%`,
      features: [
        config.commissionRate === 0 ? 'Zero commission!' : `${config.commissionRate * 100}% commission`,
        config.surgeMultiplier === 1.0 ? 'No surge pricing' : `${config.surgeMultiplier}x surge`,
        config.studentDiscount?.enabled ? `${config.studentDiscount.discountPercent}% student discount` : 'No student discount'
      ]
    };
  }

  /**
   * Recalculate fare based on actual distance traveled
   * Used when completing a ride to adjust for GPS-tracked distance
   */
  recalculateFinalFare(
    estimatedFare: number,
    estimatedDistanceKm: number,
    actualDistanceKm: number,
    estimatedTimeMin: number,
    actualTimeMin: number,
    userType: 'student' | 'regular' = 'regular'
  ): {
    finalFare: number;
    adjustment: number;
    reason: string;
  } {
    // Calculate fare based on actual distance and time
    const actualFare = this.calculateFare(actualDistanceKm, actualTimeMin, userType);

    // Compare with estimated fare
    const difference = actualFare.riderPays - estimatedFare;

    // If difference is within 10%, use estimated fare (better UX)
    const tolerance = estimatedFare * 0.1;

    if (Math.abs(difference) <= tolerance) {
      return {
        finalFare: estimatedFare,
        adjustment: 0,
        reason: 'Within tolerance - using estimated fare'
      };
    }

    // Otherwise use actual fare
    return {
      finalFare: actualFare.riderPays,
      adjustment: difference,
      reason: difference > 0 ? 'Route was longer than estimated' : 'Route was shorter than estimated'
    };
  }
}
