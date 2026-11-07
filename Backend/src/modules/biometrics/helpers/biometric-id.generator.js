const prisma = require('../../../core/database/prisma.client');

/**
 * Sequential ID generator for Biometric & Voice Authentication Subsystem
 * Follows GBS Enterprise Standards: VOX-YYYY-XXXXXX, BIO-YYYY-XXXXXX, LOG-YYYY-XXXXXX
 */
async function generateVoiceprintCode() {
  const year = new Date().getFullYear();
  const prefix = `VOX-${year}-`;
  
  const count = await prisma.biometricVoiceprint.count({
    where: {
      enrollmentCode: {
        startsWith: prefix
      }
    }
  });

  const sequentialNumber = String(count + 1).padStart(6, '0');
  return `${prefix}${sequentialNumber}`;
}

async function generateBiometricCredentialCode() {
  const year = new Date().getFullYear();
  const prefix = `BIO-${year}-`;
  
  const count = await prisma.biometricSecurityCredential.count({
    where: {
      credentialCode: {
        startsWith: prefix
      }
    }
  });

  const sequentialNumber = String(count + 1).padStart(6, '0');
  return `${prefix}${sequentialNumber}`;
}

async function generateVerificationLogCode() {
  const year = new Date().getFullYear();
  const prefix = `LOG-${year}-`;
  
  const count = await prisma.biometricVerificationLog.count({
    where: {
      logCode: {
        startsWith: prefix
      }
    }
  });

  const sequentialNumber = String(count + 1).padStart(6, '0');
  return `${prefix}${sequentialNumber}`;
}

module.exports = {
  generateVoiceprintCode,
  generateBiometricCredentialCode,
  generateVerificationLogCode
};
