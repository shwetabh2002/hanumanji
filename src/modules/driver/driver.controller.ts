import { Controller, Post, Body, Get, Patch, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { DriverService } from './driver.service';
import { DriverLocationService } from './driver-location.service';
import { UpdateLocationDto, NearbyDriversDto, DriverStatusDto, NearbyDriverResponseDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('drivers')
@Controller('drivers')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly driverLocationService: DriverLocationService,
  ) {}

  // ============ Location Updates ============

  @Post('location')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver location (call every 3-5 seconds when online)' })
  @ApiBody({ type: UpdateLocationDto })
  async updateLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
    const driverId = req.user.sub;
    
    // Get driver to get vehicle type
    const driver = await this.driverService.findById(driverId);
    const vehicleType = driver?.vehicle?.type || 'BIKE';

    // Update in Redis (real-time)
    await this.driverLocationService.updateLocation(
      driverId,
      dto.latitude,
      dto.longitude,
      vehicleType,
      dto.heading,
      dto.speed,
    );

    // Periodically sync to MongoDB (every nth call or async job)
    // For now, update MongoDB on every call (can be optimized later)
    await this.driverService.updateLocationInMongo(
      driverId,
      dto.longitude,
      dto.latitude,
      dto.heading,
      dto.speed,
    );

    return { success: true };
  }

  // ============ Status Management ============

  @Patch('status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver online/offline status' })
  @ApiBody({ type: DriverStatusDto })
  async updateStatus(@Req() req: any, @Body() dto: DriverStatusDto) {
    const driverId = req.user.sub;
    
    const driver = await this.driverService.findById(driverId);
    const vehicleType = driver?.vehicle?.type || 'BIKE';

    if (dto.status === 'online') {
      await this.driverService.setOnline(driverId);
      await this.driverLocationService.markOnline(driverId, vehicleType);
    } else {
      await this.driverService.setOffline(driverId);
      await this.driverLocationService.markOffline(driverId, vehicleType);
    }

    return {
      success: true,
      status: dto.status,
    };
  }

  // ============ Nearby Drivers (Public for booking) ============

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find nearby available drivers' })
  @ApiResponse({ status: 200, type: [NearbyDriverResponseDto] })
  async findNearbyDrivers(@Query() dto: NearbyDriversDto): Promise<NearbyDriverResponseDto[]> {
    const radiusKm = dto.radiusKm || 5;
    const limit = dto.limit || 10;

    let drivers;
    
    if (dto.vehicleType) {
      drivers = await this.driverLocationService.findNearbyDriversByVehicleType(
        dto.latitude,
        dto.longitude,
        radiusKm,
        dto.vehicleType,
        limit,
      );
    } else {
      drivers = await this.driverLocationService.findNearbyDrivers(
        dto.latitude,
        dto.longitude,
        radiusKm,
        limit,
      );
    }

    // Enrich with state data
    const results: NearbyDriverResponseDto[] = [];
    
    for (const driver of drivers) {
      const state = await this.driverLocationService.getDriverState(driver.memberId);
      
      results.push({
        driverId: driver.memberId,
        latitude: driver.latitude,
        longitude: driver.longitude,
        distance: driver.distance || 0,
        vehicleType: state?.vehicleType,
        heading: state?.heading,
      });
    }

    return results;
  }

  // ============ Driver Profile ============

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current driver profile' })
  async getProfile(@Req() req: any) {
    const driverId = req.user.sub;
    const driver = await this.driverService.findById(driverId);
    
    // Get real-time location from Redis
    const locationState = await this.driverLocationService.getDriverState(driverId);
    const isOnline = await this.driverLocationService.isOnline(driverId);

    return {
      ...driver?.toObject(),
      isOnline,
      currentLocation: locationState
        ? { latitude: locationState.latitude, longitude: locationState.longitude }
        : null,
    };
  }

  // ============ Stats ============

  @Get('online-count')
  @ApiOperation({ summary: 'Get count of online drivers' })
  async getOnlineCount() {
    const count = await this.driverLocationService.getOnlineDriverCount();
    return { onlineDrivers: count };
  }
}

