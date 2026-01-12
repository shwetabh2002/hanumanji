import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompleteRegistrationDto } from '../dto/complete-registration.dto';
import { GeofenceService } from '../../location/geofence.service';

/**
 * Driver Onboarding Service
 *
 * Phase 1 Strategy: INSTANT APPROVAL
 * - Captains can go online immediately after registration
 * - Documents verified within 24 hours (async)
 * - Competitive advantage: Start earning in 30 minutes vs Rapido's 3-7 days
 */

interface Driver {
  _id: string;
  phoneNumber: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  vehicleNumber: string;
  vehicleModel: string;
  drivingLicense: string;
  aadhaarLast4?: string;
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
  verificationStatus: 'APPROVED_PENDING_DOCS' | 'DOCS_UPLOADED' | 'VERIFIED' | 'REJECTED';
  canGoOnline: boolean;
  isVerified: boolean;
  isActive: boolean;
  status: 'offline' | 'online' | 'busy';
  serviceArea: {
    type: string;
    coordinates: number[];
    radius: number;
  };
  documents?: {
    license: { url?: string; verified: boolean };
    rc: { url?: string; verified: boolean };
    aadhaar: { url?: string; verified: boolean };
    photo: { url?: string; verified: boolean };
  };
  documentsDeadline?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DriverOnboardingService {

  constructor(
    @InjectModel('Driver') private readonly driverModel: Model<Driver>,
    private readonly geofenceService: GeofenceService
  ) {}

  /**
   * Complete driver registration with instant approval
   * Phase 1: Approve immediately, verify documents within 24 hours
   */
  async completeRegistration(dto: CompleteRegistrationDto) {

    // Check if driver already exists
    const existingDriver = await this.driverModel.findOne({
      phoneNumber: dto.phoneNumber
    });

    if (existingDriver) {
      throw new ConflictException({
        message: 'Phone number already registered',
        messageHi: 'यह phone number पहले से registered है',
        driverId: existingDriver._id,
        status: existingDriver.verificationStatus
      });
    }

    // Check for duplicate vehicle number
    const duplicateVehicle = await this.driverModel.findOne({
      vehicleNumber: dto.vehicleNumber.toUpperCase().replace(/\s/g, '')
    });

    if (duplicateVehicle) {
      throw new ConflictException({
        message: 'Vehicle number already registered',
        messageHi: 'यह vehicle number पहले से registered है'
      });
    }

    // Get service area (Pari Chowk for Phase 1)
    const serviceAreas = this.geofenceService.getActiveServiceAreas();
    const pariChowkArea = serviceAreas[0]; // Pari Chowk is first/only area in Phase 1

    // Create driver with instant approval
    const driver = await this.driverModel.create({
      phoneNumber: dto.phoneNumber,
      countryCode: '+91',
      firstName: dto.firstName,
      lastName: dto.lastName,
      vehicleNumber: dto.vehicleNumber.toUpperCase().replace(/\s/g, ''),
      vehicleModel: dto.vehicleModel,
      drivingLicense: dto.drivingLicense,
      aadhaarLast4: dto.aadhaarLast4,
      bankAccount: dto.bankAccount,

      // INSTANT APPROVAL (Phase 1 strategy)
      verificationStatus: 'APPROVED_PENDING_DOCS',
      canGoOnline: true,  // Can start earning immediately!
      isVerified: false,  // Will be verified within 24 hours
      isActive: true,
      status: 'offline',

      // Service area restriction
      serviceArea: {
        type: 'Point',
        coordinates: [pariChowkArea.center.lng, pariChowkArea.center.lat],
        radius: pariChowkArea.radiusKm
      },

      // Document placeholders
      documents: {
        license: { verified: false },
        rc: { verified: false },
        aadhaar: { verified: false },
        photo: { verified: false }
      },

      // 24-hour deadline for document upload
      documentsDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      approvedAt: new Date()
    });

    // TODO: Send SMS notification
    // await this.smsService.send(dto.phoneNumber, {
    //   template: 'captain_approved_hi',
    //   params: { name: dto.firstName, area: 'Pari Chowk' }
    // });

    return {
      driverId: driver._id,
      status: 'APPROVED_PENDING_DOCS',
      canGoOnline: true,

      // Display messages
      message: 'Approved! Upload documents within 24 hours to complete verification.',
      messageHi: 'Approve हो गया! 24 घंटे में documents upload करें।',

      // Service area info
      serviceArea: {
        name: pariChowkArea.name,
        nameHi: pariChowkArea.nameHi,
        radius: `${pariChowkArea.radiusKm} km`
      },

      // Next steps
      nextSteps: [
        {
          step: 'Upload Aadhaar photo',
          stepHi: 'Aadhaar की photo upload करें',
          completed: false,
          required: true
        },
        {
          step: 'Upload Driving License photo',
          stepHi: 'Driving License की photo upload करें',
          completed: false,
          required: true
        },
        {
          step: 'Upload RC (Registration Certificate) photo',
          stepHi: 'RC की photo upload करें',
          completed: false,
          required: true
        },
        {
          step: 'Upload profile photo',
          stepHi: 'Profile photo upload करें',
          completed: false,
          required: true
        },
        {
          step: 'Watch safety training video (10 min)',
          stepHi: 'Safety training video देखें (10 मिनट)',
          completed: false,
          required: false
        }
      ],

      // Deadline
      documentsDeadline: driver.documentsDeadline,

      // Onboarding bonus (future)
      bonus: {
        firstRideBonus: 50,
        first10RidesBonus: 500,
        message: 'Complete 10 rides in first week and earn ₹500 bonus!',
        messageHi: 'पहले week में 10 rides complete करें और ₹500 bonus पाएं!'
      }
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
      vehicleNumber: driver.vehicleNumber,
      vehicleModel: driver.vehicleModel,
      status: driver.status,
      verificationStatus: driver.verificationStatus,
      canGoOnline: driver.canGoOnline,
      isVerified: driver.isVerified,

      // Documents status
      documents: {
        allUploaded: this.areAllDocumentsUploaded(driver.documents),
        license: driver.documents?.license,
        rc: driver.documents?.rc,
        aadhaar: driver.documents?.aadhaar,
        photo: driver.documents?.photo
      },

      // Service area
      serviceArea: driver.serviceArea,

      // Bank account (masked)
      bankAccount: {
        accountNumber: `****${driver.bankAccount.accountNumber.slice(-4)}`,
        ifsc: driver.bankAccount.ifsc,
        accountHolder: driver.bankAccount.accountHolder
      },

      // Deadlines
      documentsDeadline: driver.documentsDeadline,

      // Timestamps
      approvedAt: driver.approvedAt,
      createdAt: driver.createdAt
    };
  }

  /**
   * Check if all required documents are uploaded
   */
  private areAllDocumentsUploaded(documents: any): boolean {
    if (!documents) return false;
    return !!(
      documents.license?.url &&
      documents.rc?.url &&
      documents.aadhaar?.url &&
      documents.photo?.url
    );
  }

  /**
   * Update driver documents
   * Called after document upload
   */
  async updateDocuments(
    driverId: string,
    documentType: 'license' | 'rc' | 'aadhaar' | 'photo',
    url: string
  ) {
    const driver = await this.driverModel.findById(driverId);

    if (!driver) {
      throw new BadRequestException('Driver not found');
    }

    // Update document URL
    driver.documents = driver.documents || {
      license: { verified: false },
      rc: { verified: false },
      aadhaar: { verified: false },
      photo: { verified: false }
    };

    driver.documents[documentType] = {
      url,
      verified: false // Will be verified by admin
    };

    // Check if all documents uploaded
    const allUploaded = this.areAllDocumentsUploaded(driver.documents);

    if (allUploaded && driver.verificationStatus === 'APPROVED_PENDING_DOCS') {
      driver.verificationStatus = 'DOCS_UPLOADED';
    }

    await driver.save();

    return {
      success: true,
      documentType,
      allDocumentsUploaded: allUploaded,
      verificationStatus: driver.verificationStatus,
      message: allUploaded
        ? 'All documents uploaded! Verification will be completed within 24 hours.'
        : `${documentType} uploaded successfully`,
      messageHi: allUploaded
        ? 'सभी documents upload हो गए! 24 घंटे में verification complete होगा।'
        : `${documentType} successfully upload हो गया`
    };
  }
}
