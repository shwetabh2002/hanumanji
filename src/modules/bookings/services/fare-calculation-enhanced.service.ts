import { Injectable } from '@nestjs/common';

/**
 * Enhanced Fare Calculation Service - Rapido-like Features
 *
 * Features:
 * - Dynamic surge pricing based on demand
 * - Time-based charges (night/peak hours)
 * - Waiting charges
 * - Promo code support
 * - Weather-based surge
 * - Ride-sharing discount
 */

interface FareConfig {
  phaseName: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  commissionRate: number;
  nightChargeMultiplier: number; // 10 PM - 6 AM
  peakHourMultiplier: number; // 8-10 AM, 5-8 PM
  waitingChargePerMin: number; // After 3 min free wait
  cancellationFee: number;
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
    nightCharge: number;
    peakHour: number;
    waitingCharge: number;
    weatherSurge: number;
    discount: number;
    promoDiscount: number;
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
    surgeMessage?: string;
  };
  displayTextHi: {
    fare: string;
    savings: string;
    eta: string;
    captainEarns: string;
    surgeMessage?: string;
  };
}

interface PromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minRideValue?: number;
  validUntil?: Date;
  usageLimit?: number;
  userTypes?: ('student' | 'regular')[];
}

@Injectable()
export class FareCalculationEnhancedService {

  /**
   * Greater Noida Fare Configuration - Bike Taxi Only
   */
  private readonly FARE_PHASES = {
    PHASE_1: {
      phaseName: 'Pari Chowk Launch - Zero Commission',
      baseFare: 15,
      perKm: 7,
      perMinute: 1,
      minimumFare: 20,
      commissionRate: 0, // 0% commission
      nightChargeMultiplier: 1.15, // 15% extra for night rides
      peakHourMultiplier: 1.1, // 10% extra for peak hours
      waitingChargePerMin: 1, // ₹1 per min after 3 min
      cancellationFee: 20, // ₹20 if rider cancels after captain accepts
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
      nightChargeMultiplier: 1.2, // 20% extra
      peakHourMultiplier: 1.15, // 15% extra
      waitingChargePerMin: 1.5,
      cancellationFee: 25,
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
      nightChargeMultiplier: 1.25, // 25% extra
      peakHourMultiplier: 1.2, // 20% extra
      waitingChargePerMin: 2,
      cancellationFee: 30,
      studentDiscount: {
        enabled: false,
        discountPercent: 0,
        maxDiscount: 0
      }
    }
  };

  // Current active phase
  private readonly CURRENT_PHASE = 'PHASE_1';

  /**
   * Calculate fare with all Rapido-like features
   */
  calculateFare(params: {
    distanceKm: number;
    estimatedTimeMin: number;
    userType?: 'student' | 'regular';
    pickupTime?: Date; // For night/peak hour detection
    waitingTimeMin?: number; // Captain waiting time
    availableCaptains?: number; // For surge calculation
    totalRideRequests?: number; // For surge calculation
    weather?: 'clear' | 'rain' | 'storm'; // Weather-based surge
    promoCode?: string; // Promo code
  }): FareBreakdown {
    const config = this.getCurrentConfig();
    const userType = params.userType || 'regular';
    const pickupTime = params.pickupTime || new Date();

    // 1. Base calculation
    let baseFareAmount = config.baseFare;
    let distanceFare = params.distanceKm * config.perKm;
    let timeFare = params.estimatedTimeMin * config.perMinute;

    let subtotal = baseFareAmount + distanceFare + timeFare;

    // Apply minimum fare
    subtotal = Math.max(subtotal, config.minimumFare);

    // 2. Dynamic surge pricing (Demand-Supply based)
    const surgeFare = this.calculateSurgeCharge(
      subtotal,
      params.availableCaptains || 10,
      params.totalRideRequests || 5
    );

    // 3. Time-based charges
    const { nightCharge, peakHourCharge, isNight, isPeakHour } =
      this.calculateTimeBasedCharges(subtotal, pickupTime, config);

    // 4. Weather-based surge
    const weatherSurge = this.calculateWeatherSurge(
      subtotal,
      params.weather || 'clear'
    );

    // 5. Waiting charges
    const waitingCharge = this.calculateWaitingCharges(
      params.waitingTimeMin || 0,
      config.waitingChargePerMin
    );

    // Add all charges
    let totalBeforeDiscount =
      subtotal +
      surgeFare +
      nightCharge +
      peakHourCharge +
      weatherSurge +
      waitingCharge;

    // 6. Apply student discount
    let studentDiscount = 0;
    if (
      userType === 'student' &&
      config.studentDiscount &&
      config.studentDiscount.enabled
    ) {
      studentDiscount = Math.min(
        totalBeforeDiscount * (config.studentDiscount.discountPercent / 100),
        config.studentDiscount.maxDiscount
      );
    }

    // 7. Apply promo code
    const promoDiscount = this.calculatePromoDiscount(
      params.promoCode,
      totalBeforeDiscount,
      userType
    );

    // Final calculation
    const totalDiscount = studentDiscount + promoDiscount;
    const riderPays = Math.max(
      Math.round(totalBeforeDiscount - totalDiscount),
      config.minimumFare
    );

    // Commission and captain earnings
    const commission = Math.round(riderPays * config.commissionRate);
    const captainEarns = riderPays - commission + waitingCharge; // Captain gets waiting charges

    // Rapido comparison
    const rapidoEstimate = this.estimateRapidoFare(
      params.distanceKm,
      params.estimatedTimeMin,
      pickupTime,
      params.weather
    );
    const youSave = rapidoEstimate - riderPays;
    const percentSaved = Math.round((youSave / rapidoEstimate) * 100);

    // Surge message
    let surgeMessage = '';
    let surgeMessageHi = '';

    if (surgeFare > 0) {
      surgeMessage = 'High demand - Surge pricing active';
      surgeMessageHi = 'ज़्यादा demand - Surge pricing active';
    } else if (isNight) {
      surgeMessage = 'Night ride charges apply';
      surgeMessageHi = 'रात की ride के charges लागू';
    } else if (isPeakHour) {
      surgeMessage = 'Peak hour charges apply';
      surgeMessageHi = 'Peak hour charges लागू';
    } else if (weatherSurge > 0) {
      surgeMessage = 'Weather surcharge applied';
      surgeMessageHi = 'Weather surcharge लागू';
    }

    return {
      riderPays,
      captainEarns,
      commission,
      breakdown: {
        base: baseFareAmount,
        distance: Math.round(distanceFare),
        time: Math.round(timeFare),
        surge: Math.round(surgeFare),
        nightCharge: Math.round(nightCharge),
        peakHour: Math.round(peakHourCharge),
        waitingCharge: Math.round(waitingCharge),
        weatherSurge: Math.round(weatherSurge),
        discount: Math.round(studentDiscount),
        promoDiscount: Math.round(promoDiscount)
      },
      comparison: {
        rapidoEstimate,
        youSave: Math.max(0, youSave),
        percentSaved: Math.max(0, percentSaved)
      },
      displayText: {
        fare: `₹${riderPays}`,
        savings: youSave > 0 ? `Save ₹${youSave} vs Rapido` : `₹${riderPays}`,
        eta: `${params.estimatedTimeMin} min`,
        captainEarns: `Earn ₹${captainEarns}`,
        surgeMessage
      },
      displayTextHi: {
        fare: `₹${riderPays}`,
        savings: youSave > 0 ? `Rapido से ₹${youSave} बचाएं` : `₹${riderPays}`,
        eta: `${params.estimatedTimeMin} मिनट`,
        captainEarns: `₹${captainEarns} कमाएं`,
        surgeMessage: surgeMessageHi
      }
    };
  }

  /**
   * Calculate dynamic surge based on demand-supply ratio
   * Rapido-like: More requests than captains = surge
   */
  private calculateSurgeCharge(
    baseFare: number,
    availableCaptains: number,
    totalRequests: number
  ): number {
    if (availableCaptains === 0) {
      // No captains available - high surge
      return baseFare * 0.5; // 50% surge
    }

    const demandSupplyRatio = totalRequests / availableCaptains;

    // Surge thresholds (like Rapido)
    if (demandSupplyRatio > 3) {
      return baseFare * 0.5; // 50% surge (very high demand)
    } else if (demandSupplyRatio > 2) {
      return baseFare * 0.3; // 30% surge (high demand)
    } else if (demandSupplyRatio > 1.5) {
      return baseFare * 0.15; // 15% surge (moderate demand)
    }

    return 0; // No surge
  }

  /**
   * Calculate time-based charges (night + peak hours)
   */
  private calculateTimeBasedCharges(
    baseFare: number,
    time: Date,
    config: FareConfig
  ): {
    nightCharge: number;
    peakHourCharge: number;
    isNight: boolean;
    isPeakHour: boolean;
  } {
    const hour = time.getHours();

    // Night hours: 10 PM (22:00) to 6 AM (06:00)
    const isNight = hour >= 22 || hour < 6;

    // Peak hours: 8-10 AM and 5-8 PM
    const isPeakHour =
      (hour >= 8 && hour < 10) ||
      (hour >= 17 && hour < 20);

    let nightCharge = 0;
    let peakHourCharge = 0;

    if (isNight) {
      nightCharge = baseFare * (config.nightChargeMultiplier - 1);
    } else if (isPeakHour) {
      peakHourCharge = baseFare * (config.peakHourMultiplier - 1);
    }

    return { nightCharge, peakHourCharge, isNight, isPeakHour };
  }

  /**
   * Calculate weather-based surge
   * Rapido charges extra during rain/storm
   */
  private calculateWeatherSurge(
    baseFare: number,
    weather: 'clear' | 'rain' | 'storm'
  ): number {
    switch (weather) {
      case 'storm':
        return baseFare * 0.25; // 25% surge for storm
      case 'rain':
        return baseFare * 0.15; // 15% surge for rain
      default:
        return 0;
    }
  }

  /**
   * Calculate waiting charges
   * First 3 minutes free, then ₹1-2 per minute
   */
  private calculateWaitingCharges(
    waitingTimeMin: number,
    chargePerMin: number
  ): number {
    const FREE_WAIT_TIME = 3; // 3 minutes free

    if (waitingTimeMin <= FREE_WAIT_TIME) {
      return 0;
    }

    const chargeableTime = waitingTimeMin - FREE_WAIT_TIME;
    return chargeableTime * chargePerMin;
  }

  /**
   * Calculate promo code discount
   */
  private calculatePromoDiscount(
    promoCode: string | undefined,
    baseFare: number,
    userType: 'student' | 'regular'
  ): number {
    if (!promoCode) return 0;

    // Mock promo codes (in production, fetch from database)
    const validPromos: { [key: string]: PromoCode } = {
      'FIRST50': {
        code: 'FIRST50',
        discountType: 'percentage',
        discountValue: 50,
        maxDiscount: 50,
        minRideValue: 30
      },
      'SAVE20': {
        code: 'SAVE20',
        discountType: 'fixed',
        discountValue: 20,
        minRideValue: 40
      },
      'STUDENT25': {
        code: 'STUDENT25',
        discountType: 'percentage',
        discountValue: 25,
        maxDiscount: 25,
        userTypes: ['student']
      }
    };

    const promo = validPromos[promoCode.toUpperCase()];

    if (!promo) return 0;

    // Check user type restriction
    if (promo.userTypes && !promo.userTypes.includes(userType)) {
      return 0;
    }

    // Check minimum ride value
    if (promo.minRideValue && baseFare < promo.minRideValue) {
      return 0;
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = baseFare * (promo.discountValue / 100);
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = promo.discountValue;
    }

    return discount;
  }

  /**
   * Estimate Rapido fare with time/weather adjustments
   */
  private estimateRapidoFare(
    distanceKm: number,
    estimatedTimeMin: number,
    time: Date,
    weather?: 'clear' | 'rain' | 'storm'
  ): number {
    const RAPIDO_BASE = 25;
    const RAPIDO_PER_KM = 9;
    const RAPIDO_PER_MIN = 2;

    let fare = RAPIDO_BASE + (distanceKm * RAPIDO_PER_KM) + (estimatedTimeMin * RAPIDO_PER_MIN);

    // Apply Rapido's charges
    const hour = time.getHours();
    const isNight = hour >= 22 || hour < 6;
    const isPeak = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 20);

    if (isNight) {
      fare *= 1.25; // Rapido night charge
    } else if (isPeak) {
      fare *= 1.2; // Rapido peak hour charge
    }

    if (weather === 'rain') {
      fare *= 1.2; // Rapido rain surge
    } else if (weather === 'storm') {
      fare *= 1.3; // Rapido storm surge
    }

    fare = Math.max(fare, 40); // Rapido minimum fare

    return Math.round(fare);
  }

  /**
   * Get current configuration
   */
  private getCurrentConfig(): FareConfig {
    return this.FARE_PHASES[this.CURRENT_PHASE];
  }

  /**
   * Get cancellation fee
   */
  getCancellationFee(): number {
    return this.getCurrentConfig().cancellationFee;
  }

  /**
   * Get phase information
   */
  getCurrentPhaseInfo() {
    const config = this.getCurrentConfig();

    return {
      phase: this.CURRENT_PHASE,
      name: config.phaseName,
      commissionRate: config.commissionRate,
      commissionDisplay: `${config.commissionRate * 100}%`,
      features: [
        config.commissionRate === 0 ? 'Zero commission!' : `${config.commissionRate * 100}% commission`,
        'Dynamic surge pricing',
        'Night charges (10 PM - 6 AM)',
        'Peak hour charges (8-10 AM, 5-8 PM)',
        'Weather-based pricing',
        'Promo code support',
        config.studentDiscount?.enabled ? `${config.studentDiscount.discountPercent}% student discount` : 'No student discount'
      ]
    };
  }

  /**
   * Recalculate final fare based on actual distance/time
   */
  recalculateFinalFare(params: {
    estimatedFare: number;
    estimatedDistanceKm: number;
    actualDistanceKm: number;
    estimatedTimeMin: number;
    actualTimeMin: number;
    userType?: 'student' | 'regular';
    waitingTimeMin?: number;
    pickupTime?: Date;
    weather?: 'clear' | 'rain' | 'storm';
  }): {
    finalFare: number;
    adjustment: number;
    reason: string;
  } {
    // Recalculate with actual values
    const actualFare = this.calculateFare({
      distanceKm: params.actualDistanceKm,
      estimatedTimeMin: params.actualTimeMin,
      userType: params.userType,
      waitingTimeMin: params.waitingTimeMin,
      pickupTime: params.pickupTime,
      weather: params.weather
    });

    const difference = actualFare.riderPays - params.estimatedFare;

    // Tolerance: Within 15% of estimate, use estimated fare
    const tolerance = params.estimatedFare * 0.15;

    if (Math.abs(difference) <= tolerance) {
      return {
        finalFare: params.estimatedFare,
        adjustment: 0,
        reason: 'Within tolerance - using estimated fare'
      };
    }

    return {
      finalFare: actualFare.riderPays,
      adjustment: difference,
      reason: difference > 0
        ? 'Route was longer/slower than estimated'
        : 'Route was shorter/faster than estimated'
    };
  }
}
