import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompleteRegistrationDto } from '../dto/complete-registration.dto';
import { GeofenceService } from '../../location/geofence.service';
import { DriverStatus, DocumentVerificationStatus, VehicleType } from '../../../common/enums';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Driver, DriverDocument } from '../schemas/driver.schema';

/**
 * Driver Onboarding Service
 *
 * Architecture:
 * - User schema: Basic user/account info (phoneNumber, OTP, auth)
 * - Driver schema: Driver-specific info with userId reference to User._id
 * - Link established via phone number lookup
 *
 * NEW: Approval Workflow
 * - Drivers register with full KYC (Aadhaar, PAN, vehicle details)
 * - Admin reviews and approves/rejects within 24 hours
 * - Only approved drivers can go online
 * - Documents can be uploaded and verified after approval
 */

@Injectable()
export class DriverOnboardingService {

  constructor(
    @InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly geofenceService: GeofenceService
  ) {}

  /**
   * Complete driver registration with instant approval
   * Phase 1: Approve immediately, verify documents within 24 hours
   * @param dto - Driver registration details
   * @param userId - User ID from JWT token (links to users collection)
   */
  async completeRegistration(dto: CompleteRegistrationDto, userId: string) {

    // Verify user exists in User table
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException({
        message: 'User not found. Please register first.',
        messageHi: 'User नहीं मिला। पहले register करें।'
      });
    }

    // Check if this userId already has a driver record
    const existingDriver = await this.driverModel.findOne({ userId });

    if (existingDriver) {
      throw new ConflictException({
        message: 'Driver registration already completed',
        messageHi: 'Driver registration पहले से complete है',
        driverId: existingDriver._id,
        status: existingDriver.status
      });
    }

    // Check if phone number already used by another driver
    const duplicatePhone = await this.driverModel.findOne({
      phoneNumber: dto.phoneNumber
    });

    if (duplicatePhone) {
      throw new ConflictException({
        message: 'Phone number already registered',
        messageHi: 'यह phone number पहले से registered है',
        driverId: duplicatePhone._id
      });
    }

    // Check for duplicate vehicle number
    const duplicateVehicle = await this.driverModel.findOne({
      'vehicle.registrationNumber': dto.vehicle.registrationNumber.toUpperCase().replace(/\s/g, '')
    });

    if (duplicateVehicle) {
      throw new ConflictException({
        message: 'Vehicle number already registered',
        messageHi: 'यह vehicle number पहले से registered है'
      });
    }

    // Check for duplicate license
    const duplicateLicense = await this.driverModel.findOne({
      licenseNumber: dto.licenseNumber
    });

    if (duplicateLicense) {
      throw new ConflictException({
        message: 'License number already registered',
        messageHi: 'यह license number पहले से registered है'
      });
    }

    // Check for duplicate Aadhaar
    const duplicateAadhaar = await this.driverModel.findOne({
      aadharNumber: dto.aadharNumber
    });

    if (duplicateAadhaar) {
      throw new ConflictException({
        message: 'Aadhaar number already registered',
        messageHi: 'यह Aadhaar number पहले से registered है'
      });
    }

    // Check for duplicate PAN
    const duplicatePAN = await this.driverModel.findOne({
      panNumber: dto.panNumber
    });

    if (duplicatePAN) {
      throw new ConflictException({
        message: 'PAN number already registered',
        messageHi: 'यह PAN number पहले से registered है'
      });
    }

    // Get service area (Pari Chowk for Phase 1)
    const serviceAreas = this.geofenceService.getActiveServiceAreas();
    const pariChowkArea = serviceAreas[0]; // Pari Chowk is first/only area in Phase 1

    // Create driver with PENDING APPROVAL status (NEW: Approval workflow)
    const driver = await this.driverModel.create({
      userId, // Link to users collection via JWT userId
      phoneNumber: dto.phoneNumber,
      countryCode: '+91',
      firstName: dto.firstName,
      lastName: dto.lastName,

      // Identity Documents (Full details)
      licenseNumber: dto.licenseNumber,
      licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
      aadharNumber: dto.aadharNumber, // Full 12-digit Aadhaar (encrypt in production)
      panNumber: dto.panNumber, // PAN card

      // Full Vehicle Details
      vehicle: {
        type: dto.vehicle.type,
        make: dto.vehicle.make,
        model: dto.vehicle.model,
        year: dto.vehicle.year,
        color: dto.vehicle.color,
        registrationNumber: dto.vehicle.registrationNumber.toUpperCase().replace(/\s/g, ''),
        rcNumber: dto.vehicle.rcNumber,
        insuranceNumber: dto.vehicle.insuranceNumber,
        insuranceExpiry: dto.vehicle.insuranceExpiry ? new Date(dto.vehicle.insuranceExpiry) : undefined,
      },

      // Bank Details
      bankDetails: {
        accountNumber: dto.bankAccount.accountNumber,
        ifscCode: dto.bankAccount.ifsc,
        holderName: dto.bankAccount.accountHolder,
      },

      // NEW: PENDING APPROVAL WORKFLOW (instead of instant approval)
      status: DriverStatus.PENDING_APPROVAL,
      canGoOnline: false,  // Can't go online until approved by admin
      isVerified: false,   // Will be set to true after admin approval
      isPhoneVerified: true, // Already verified via OTP during user registration

      // Document Verification Status (all NOT_UPLOADED initially)
      licenseVerificationStatus: DocumentVerificationStatus.NOT_UPLOADED,
      aadharVerificationStatus: DocumentVerificationStatus.NOT_UPLOADED,
      panVerificationStatus: DocumentVerificationStatus.NOT_UPLOADED,
      rcVerificationStatus: DocumentVerificationStatus.NOT_UPLOADED,
    });

    // TODO: Send SMS notification
    // await this.smsService.send(dto.phoneNumber, {
    //   template: 'driver_registration_submitted',
    //   params: { name: dto.firstName }
    // });

    return {
      success: true,
      driverId: driver._id,
      status: DriverStatus.PENDING_APPROVAL,
      canGoOnline: false,

      // Display messages
      message: 'Registration submitted successfully! Your application will be reviewed by our team within 24 hours.',
      messageHi: 'Registration सफलतापूर्वक submit हो गया! आपका application 24 घंटे में review होगा।',

      // Service area info
      serviceArea: {
        name: pariChowkArea.name,
        nameHi: pariChowkArea.nameHi,
        radius: `${pariChowkArea.radiusKm} km`
      },

      // Next steps
      nextSteps: [
        {
          step: 'Wait for admin approval',
          stepHi: 'Admin approval का इंतज़ार करें',
          completed: false,
          required: true,
          eta: '24 hours'
        },
        {
          step: 'You will receive notification once approved',
          stepHi: 'Approve होने पर notification मिलेगा',
          completed: false,
          required: false
        },
        {
          step: 'After approval, upload documents if required',
          stepHi: 'Approval के बाद documents upload करें (यदि ज़रूरी हो)',
          completed: false,
          required: false
        }
      ],

      // Estimated approval time
      estimatedApprovalTime: '24 hours',
      estimatedApprovalTimeHi: '24 घंटे',

      // Note
      note: 'You can check your application status anytime in the app.',
      noteHi: 'आप अपना application status app में कभी भी check कर सकते हैं।'
    };
  }

  /**
   * Get driver profile
   */
  async getDriverProfile(driverId: string) {
    const driver = await this.driverModel.findById(driverId);

    if (!driver) {
      throw new BadRequestException({
        message: 'Driver not found',
        messageHi: 'Driver नहीं मिला'
      });
    }

    return {
      id: driver._id,
      name: `${driver.firstName} ${driver.lastName}`,
      phoneNumber: driver.phoneNumber,

      // Status
      status: driver.status,
      canGoOnline: driver.canGoOnline,
      isVerified: driver.isVerified,

      // Vehicle info
      vehicle: {
        type: driver.vehicle?.type,
        make: driver.vehicle?.make,
        model: driver.vehicle?.model,
        year: driver.vehicle?.year,
        color: driver.vehicle?.color,
        registrationNumber: driver.vehicle?.registrationNumber,
      },

      // License info
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,

      // Document verification status
      documentsStatus: {
        license: driver.licenseVerificationStatus,
        aadhar: driver.aadharVerificationStatus,
        pan: driver.panVerificationStatus,
        rc: driver.rcVerificationStatus,
      },

      // Bank account (masked)
      bankDetails: driver.bankDetails ? {
        accountNumber: `****${driver.bankDetails.accountNumber?.slice(-4) || '****'}`,
        ifscCode: driver.bankDetails.ifscCode,
        holderName: driver.bankDetails.holderName,
      } : null,

      // Approval info
      approvedBy: driver.approvedBy,
      approvedAt: driver.approvedAt,
      rejectedBy: driver.rejectedBy,
      rejectedAt: driver.rejectedAt,
      rejectionReason: driver.rejectionReason,

      // Timestamps
      createdAt: (driver as any).createdAt, // From timestamps: true option
      updatedAt: (driver as any).updatedAt, // From timestamps: true option
    };
  }

  /**
   * Get list of pending driver applications (Admin only)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   */
  async getPendingDrivers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      this.driverModel
        .find({ status: DriverStatus.PENDING_APPROVAL })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.driverModel.countDocuments({ status: DriverStatus.PENDING_APPROVAL }),
    ]);

    return {
      drivers: drivers.map(d => ({
        id: d._id,
        name: `${d.firstName} ${d.lastName}`,
        phoneNumber: d.phoneNumber,
        vehicleType: d.vehicle?.type,
        vehicleNumber: d.vehicle?.registrationNumber,
        vehicleMake: d.vehicle?.make,
        vehicleModel: d.vehicle?.model,
        aadharLast4: d.aadharNumber?.slice(-4),
        panNumber: d.panNumber,
        licenseNumber: d.licenseNumber,
        registeredAt: (d as any).createdAt, // From timestamps: true option
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve driver application (Admin only)
   * @param driverId - Driver ID to approve
   * @param adminId - Admin user ID performing approval
   * @param documentsRequired - Whether documents are still required
   */
  async approveDriver(driverId: string, adminId: string, documentsRequired: boolean = true) {
    const driver = await this.driverModel.findById(driverId);

    if (!driver) {
      throw new NotFoundException({
        message: 'Driver not found',
        messageHi: 'Driver नहीं मिला'
      });
    }

    if (driver.status !== DriverStatus.PENDING_APPROVAL) {
      throw new BadRequestException({
        message: `Cannot approve driver with status: ${driver.status}`,
        messageHi: `इस status वाले driver को approve नहीं कर सकते: ${driver.status}`
      });
    }

    // Update driver status
    driver.status = documentsRequired ? DriverStatus.DOCUMENTS_PENDING : DriverStatus.APPROVED;
    driver.approvedBy = adminId;
    driver.approvedAt = new Date();
    driver.isVerified = !documentsRequired; // Fully verified if no documents needed
    driver.canGoOnline = !documentsRequired; // Can go online only if fully approved

    await driver.save();

    console.log(`✅ [DriverOnboarding] Driver ${driverId} approved by admin ${adminId}`);
    console.log(`   Status: ${driver.status}, canGoOnline: ${driver.canGoOnline}`);

    // TODO: Send SMS notification
    // await this.smsService.send(driver.phoneNumber, {
    //   template: 'driver_approved',
    //   params: { name: driver.firstName }
    // });

    return {
      success: true,
      driverId: driver._id,
      status: driver.status,
      canGoOnline: driver.canGoOnline,
      message: documentsRequired
        ? 'Driver approved! Documents required before going online.'
        : 'Driver fully approved! Can go online now.',
      messageHi: documentsRequired
        ? 'Driver approve हो गया! Online जाने से पहले documents चाहिए।'
        : 'Driver पूरी तरह approve हो गया! अब online जा सकते हैं।',
    };
  }

  /**
   * Reject driver application (Admin only)
   * @param driverId - Driver ID to reject
   * @param adminId - Admin user ID performing rejection
   * @param reason - Reason for rejection
   */
  async rejectDriver(driverId: string, adminId: string, reason: string) {
    const driver = await this.driverModel.findById(driverId);

    if (!driver) {
      throw new NotFoundException({
        message: 'Driver not found',
        messageHi: 'Driver नहीं मिला'
      });
    }

    if (driver.status !== DriverStatus.PENDING_APPROVAL) {
      throw new BadRequestException({
        message: `Cannot reject driver with status: ${driver.status}`,
        messageHi: `इस status वाले driver को reject नहीं कर सकते: ${driver.status}`
      });
    }

    // Update driver status
    driver.status = DriverStatus.REJECTED;
    driver.rejectedBy = adminId;
    driver.rejectedAt = new Date();
    driver.rejectionReason = reason;
    driver.canGoOnline = false;

    await driver.save();

    console.log(`❌ [DriverOnboarding] Driver ${driverId} rejected by admin ${adminId}`);
    console.log(`   Reason: ${reason}`);

    // TODO: Send SMS notification
    // await this.smsService.send(driver.phoneNumber, {
    //   template: 'driver_rejected',
    //   params: { name: driver.firstName, reason }
    // });

    return {
      success: true,
      driverId: driver._id,
      status: DriverStatus.REJECTED,
      reason,
      message: 'Driver application rejected',
      messageHi: 'Driver का application reject हो गया',
    };
  }

  /**
   * Get driver status by user ID (for driver to check their own status)
   * @param userId - User ID from JWT token
   */
  async getDriverStatusByUserId(userId: string) {
    const driver = await this.driverModel.findOne({ userId });

    if (!driver) {
      return {
        registered: false,
        message: 'Not registered as driver yet',
        messageHi: 'अभी driver registration नहीं हुआ',
      };
    }

    return {
      registered: true,
      driverId: driver._id,
      status: driver.status,
      canGoOnline: driver.canGoOnline,
      isVerified: driver.isVerified,
      documentsStatus: {
        license: driver.licenseVerificationStatus,
        aadhar: driver.aadharVerificationStatus,
        pan: driver.panVerificationStatus,
        rc: driver.rcVerificationStatus,
      },
      approvedAt: driver.approvedAt,
      rejectedAt: driver.rejectedAt,
      rejectionReason: driver.rejectionReason,
      message: this.getStatusMessage(driver.status),
      messageHi: this.getStatusMessageHi(driver.status),
    };
  }

  /**
   * Helper: Get status message in English
   */
  private getStatusMessage(status: DriverStatus): string {
    switch (status) {
      case DriverStatus.PENDING_APPROVAL:
        return 'Your application is under review. You will be notified within 24 hours.';
      case DriverStatus.DOCUMENTS_PENDING:
        return 'You are approved! Please upload required documents to start earning.';
      case DriverStatus.APPROVED:
        return 'You are fully approved! You can go online and start accepting rides.';
      case DriverStatus.REJECTED:
        return 'Your application was rejected. Please contact support for details.';
      case DriverStatus.OFFLINE:
        return 'You are offline. Go online to start receiving ride requests.';
      case DriverStatus.ONLINE:
        return 'You are online and accepting ride requests!';
      case DriverStatus.BUSY:
        return 'You are currently on a ride.';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Helper: Get status message in Hindi
   */
  private getStatusMessageHi(status: DriverStatus): string {
    switch (status) {
      case DriverStatus.PENDING_APPROVAL:
        return 'आपका application review में है। 24 घंटे में notify किया जाएगा।';
      case DriverStatus.DOCUMENTS_PENDING:
        return 'आप approve हो गए! Documents upload करें और earning शुरू करें।';
      case DriverStatus.APPROVED:
        return 'आप पूरी तरह approve हैं! Online जाएं और rides लेना शुरू करें।';
      case DriverStatus.REJECTED:
        return 'आपका application reject हो गया। Details के लिए support से संपर्क करें।';
      case DriverStatus.OFFLINE:
        return 'आप offline हैं। Online जाएं ride requests पाने के लिए।';
      case DriverStatus.ONLINE:
        return 'आप online हैं और ride requests ले रहे हैं!';
      case DriverStatus.BUSY:
        return 'आप अभी ride पर हैं।';
      default:
        return 'Unknown status';
    }
  }
}
