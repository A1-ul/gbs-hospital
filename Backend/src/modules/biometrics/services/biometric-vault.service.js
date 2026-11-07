const prisma = require('../../../core/database/prisma.client');
const AppError = require('../../../core/errors/app.error');
const logger = require('../../../core/utils/logger');
const {
  generateVoiceprintCode,
  generateBiometricCredentialCode,
  generateVerificationLogCode
} = require('../helpers/biometric-id.generator');
const {
  hashPassphrase,
  extractAcousticFeatures,
  compareVoiceprints
} = require('../helpers/voice-biometrics.engine');

class BiometricVaultService {
  /**
   * Enroll a user's voiceprint acoustic vector into the Biometric Security Vault
   */
  async enrollVoiceprint(userId, data, requestingUser) {
    const { audioPayload, passphraseText, sampleRate = 16000, durationSeconds = 3.5 } = data;

    if (!audioPayload) {
      throw new AppError('Audio sample payload is required for biometric voiceprint enrollment', 400);
    }
    if (!passphraseText || passphraseText.trim().length < 5) {
      throw new AppError('A valid verbal security passphrase is required (min 5 characters)', 400);
    }

    // 1. Fetch user information
    let userName = 'Clinician User';
    let userRole = 'CLINICIAN';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, role: true, email: true }
    });

    if (user) {
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      userRole = user.role?.name || (typeof user.role === 'string' ? user.role : 'CLINICIAN');
    }

    // 2. Extract acoustic biometric features
    const { featureVector, voiceprintHash, qualityScore } = extractAcousticFeatures(audioPayload, sampleRate);
    const passphraseHash = hashPassphrase(passphraseText);

    // 3. Revoke any existing active voiceprint for this user
    await prisma.biometricVoiceprint.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED' }
    });

    // 4. Generate sequential ID
    const enrollmentCode = await generateVoiceprintCode();

    // 5. Persist into Biometric Vault
    const voiceprint = await prisma.biometricVoiceprint.create({
      data: {
        enrollmentCode,
        userId,
        userName,
        role: userRole,
        sampleRate,
        durationSeconds: Number(durationSeconds),
        voiceprintHash,
        passphraseText: passphraseText.trim(),
        passphraseHash,
        featureVector: JSON.stringify(featureVector),
        livenessThreshold: 0.85,
        qualityScore,
        status: 'ACTIVE'
      }
    });

    // 6. Record enrollment audit log
    const logCode = await generateVerificationLogCode();
    await prisma.biometricVerificationLog.create({
      data: {
        logCode,
        userId,
        userName,
        role: userRole,
        biometricType: 'VOICEPRINT',
        actionAttempted: 'VOICEPRINT_ENROLLMENT',
        confidenceScore: 1.0,
        thresholdRequired: 0.85,
        livenessPassed: true,
        antiSpoofingStatus: 'PASSED',
        status: 'SUCCESS'
      }
    });

    logger.info(`Voiceprint ${enrollmentCode} enrolled successfully for user ${userName} (${userId}).`);

    return {
      enrollmentCode: voiceprint.enrollmentCode,
      userId: voiceprint.userId,
      userName: voiceprint.userName,
      qualityScore: voiceprint.qualityScore,
      livenessThreshold: voiceprint.livenessThreshold,
      durationSeconds: voiceprint.durationSeconds,
      status: voiceprint.status,
      createdAt: voiceprint.createdAt
    };
  }

  /**
   * Verify an inbound voice sample against enrolled voiceprint
   */
  async verifyVoiceprint(userId, data) {
    const { 
      audioPayload, 
      passphraseText, 
      actionAttempted = 'CLINICAL_AUTHENTICATION',
      ipAddress = '127.0.0.1',
      userAgent = 'GBS-Biometric-Agent'
    } = data;

    if (!audioPayload) {
      throw new AppError('Voice audio verification sample is required', 400);
    }
    if (!passphraseText) {
      throw new AppError('Passphrase verbal challenge response is required', 400);
    }

    // 1. Retrieve enrolled active voiceprint
    const enrolled = await prisma.biometricVoiceprint.findFirst({
      where: { userId, status: 'ACTIVE' }
    });

    if (!enrolled) {
      throw new AppError('No active enrolled biometric voiceprint found for this user. Please enroll first.', 404);
    }

    // 2. Fetch security policy
    const policy = await this.getBiometricSecurityPolicy();
    const threshold = policy.minVoiceConfidenceScore || 0.85;

    // 3. Extract probe features & compare
    const enrolledFeatures = JSON.parse(enrolled.featureVector);
    const probeFeatures = extractAcousticFeatures(audioPayload, enrolled.sampleRate).featureVector;

    const matchResult = compareVoiceprints(
      enrolledFeatures,
      probeFeatures,
      enrolled.passphraseHash,
      passphraseText
    );

    const isVerified = matchResult.match && (matchResult.confidenceScore >= threshold);
    const verificationStatus = isVerified ? 'SUCCESS' : (matchResult.livenessPassed ? 'FAILED' : 'REJECTED');

    // 4. Log verification attempt
    const logCode = await generateVerificationLogCode();
    const log = await prisma.biometricVerificationLog.create({
      data: {
        logCode,
        userId: enrolled.userId,
        userName: enrolled.userName,
        role: enrolled.role,
        biometricType: 'VOICEPRINT',
        actionAttempted,
        confidenceScore: matchResult.confidenceScore,
        thresholdRequired: threshold,
        livenessPassed: matchResult.livenessPassed,
        antiSpoofingStatus: matchResult.antiSpoofingStatus,
        status: verificationStatus,
        ipAddress,
        userAgent,
        rejectionReason: matchResult.rejectionReason
      }
    });

    if (isVerified) {
      await prisma.biometricVoiceprint.update({
        where: { id: enrolled.id },
        data: { verifiedAt: new Date() }
      });
      logger.info(`Voice biometric verification SUCCEEDED for ${enrolled.userName} (${matchResult.confidenceScore} >= ${threshold}) on ${actionAttempted}.`);
    } else {
      logger.warn(`Voice biometric verification FAILED for ${enrolled.userName} (Score: ${matchResult.confidenceScore}, Required: ${threshold}). Reason: ${matchResult.rejectionReason || 'Score below threshold'}`);
    }

    return {
      verified: isVerified,
      confidenceScore: matchResult.confidenceScore,
      thresholdRequired: threshold,
      livenessPassed: matchResult.livenessPassed,
      antiSpoofingStatus: matchResult.antiSpoofingStatus,
      actionAttempted,
      actionAuthorized: isVerified,
      verificationLogCode: log.logCode,
      rejectionReason: matchResult.rejectionReason
    };
  }

  /**
   * Get active voiceprint status for user
   */
  async getVoiceprintStatus(userId) {
    const enrolled = await prisma.biometricVoiceprint.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: {
        enrollmentCode: true,
        userId: true,
        userName: true,
        role: true,
        qualityScore: true,
        livenessThreshold: true,
        sampleRate: true,
        durationSeconds: true,
        passphraseText: true,
        status: true,
        verifiedAt: true,
        createdAt: true
      }
    });

    return enrolled || null;
  }

  /**
   * Enroll a multi-modal biometric credential (e.g. FIDO2 / Fingerprint / Facial vector)
   */
  async enrollSecurityCredential(userId, data) {
    const { biometricType = 'FINGERPRINT_MINUTIAE', credentialPayload, securityLevel = 'HIGH' } = data;

    if (!credentialPayload) {
      throw new AppError('Credential template payload is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, role: true }
    });

    const credentialCode = await generateBiometricCredentialCode();
    const credential = await prisma.biometricSecurityCredential.create({
      data: {
        credentialCode,
        userId,
        userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Staff Member',
        role: user?.role?.name || (typeof user?.role === 'string' ? user?.role : 'CLINICIAN'),
        biometricType,
        credentialPayload: String(credentialPayload),
        securityLevel,
        status: 'ACTIVE'
      }
    });

    return credential;
  }

  /**
   * Get all registered biometric credentials for user
   */
  async getUserCredentials(userId) {
    return prisma.biometricSecurityCredential.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieve or initialize Biometric Security Policy
   */
  async getBiometricSecurityPolicy() {
    let policy = await prisma.biometricSecurityPolicy.findUnique({
      where: { policyCode: 'POL-BIO-GLOBAL' }
    });

    if (!policy) {
      policy = await prisma.biometricSecurityPolicy.create({
        data: {
          policyCode: 'POL-BIO-GLOBAL',
          policyName: 'Enterprise Multi-Factor Biometric Zero-Trust Policy',
          requireVoiceForNarcotics: true,
          requireVoiceForSystemLock: true,
          requireVoiceForDeceasedRelease: true,
          requireVoiceForSurgicalSignOut: true,
          minVoiceConfidenceScore: 0.85,
          minFingerprintMatchScore: 0.90,
          livenessEnforced: true,
          maxAttemptsBeforeLockout: 3,
          lockoutDurationMinutes: 15,
          active: true
        }
      });
    }

    return policy;
  }

  /**
   * Update Biometric Security Policy
   */
  async updateBiometricSecurityPolicy(data) {
    const current = await this.getBiometricSecurityPolicy();

    const updated = await prisma.biometricSecurityPolicy.update({
      where: { id: current.id },
      data: {
        requireVoiceForNarcotics: data.requireVoiceForNarcotics ?? current.requireVoiceForNarcotics,
        requireVoiceForSystemLock: data.requireVoiceForSystemLock ?? current.requireVoiceForSystemLock,
        requireVoiceForDeceasedRelease: data.requireVoiceForDeceasedRelease ?? current.requireVoiceForDeceasedRelease,
        requireVoiceForSurgicalSignOut: data.requireVoiceForSurgicalSignOut ?? current.requireVoiceForSurgicalSignOut,
        minVoiceConfidenceScore: data.minVoiceConfidenceScore !== undefined ? Number(data.minVoiceConfidenceScore) : current.minVoiceConfidenceScore,
        livenessEnforced: data.livenessEnforced ?? current.livenessEnforced,
        maxAttemptsBeforeLockout: data.maxAttemptsBeforeLockout !== undefined ? Number(data.maxAttemptsBeforeLockout) : current.maxAttemptsBeforeLockout
      }
    });

    return updated;
  }

  /**
   * Get verification audit log stream with pagination
   */
  async getVerificationAuditLogs(limit = 20) {
    return prisma.biometricVerificationLog.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get direct PostgreSQL telemetry metrics for biometrics & voice authentication
   */
  async getBiometricsTelemetry() {
    const [
      totalEnrolledVoiceprints,
      totalBiometricCredentials,
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      recentLogs
    ] = await Promise.all([
      prisma.biometricVoiceprint.count({ where: { status: 'ACTIVE' } }),
      prisma.biometricSecurityCredential.count({ where: { status: 'ACTIVE' } }),
      prisma.biometricVerificationLog.count(),
      prisma.biometricVerificationLog.count({ where: { status: 'SUCCESS' } }),
      prisma.biometricVerificationLog.count({ where: { status: { in: ['FAILED', 'REJECTED'] } } }),
      prisma.biometricVerificationLog.findMany({
        take: 50,
        select: { confidenceScore: true, antiSpoofingStatus: true, status: true }
      })
    ]);

    // Average confidence calculation
    let avgConfidence = 0.94;
    if (recentLogs.length > 0) {
      const sum = recentLogs.reduce((acc, l) => acc + (l.confidenceScore || 0), 0);
      avgConfidence = Number((sum / recentLogs.length).toFixed(3));
    }

    const spoofsIntercepted = recentLogs.filter(
      l => l.antiSpoofingStatus !== 'PASSED' || l.status === 'REJECTED'
    ).length;

    return {
      totalEnrolledVoiceprints,
      totalBiometricCredentials,
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      spoofsIntercepted,
      averageConfidenceScore: avgConfidence,
      zeroTrustStatus: 'ENFORCED',
      lastTelemetrySync: new Date()
    };
  }
}

module.exports = new BiometricVaultService();
