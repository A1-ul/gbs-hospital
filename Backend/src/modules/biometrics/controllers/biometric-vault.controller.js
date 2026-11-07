const biometricVaultService = require('../services/biometric-vault.service');

class BiometricVaultController {
  async enrollVoiceprint(req, res, next) {
    try {
      const userId = req.body.userId || req.user?.id;
      const result = await biometricVaultService.enrollVoiceprint(userId, req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Biometric voiceprint enrolled into Central Security Vault.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyVoiceprint(req, res, next) {
    try {
      const userId = req.body.userId || req.user?.id;
      const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'GBS-Client';
      
      const payload = {
        ...req.body,
        ipAddress: clientIp,
        userAgent
      };

      const result = await biometricVaultService.verifyVoiceprint(userId, payload);
      const statusCode = result.verified ? 200 : 403;
      return res.status(statusCode).json({
        success: result.verified,
        message: result.verified 
          ? 'Voice biometric match confirmed. Action authorized.' 
          : `Voice verification denied: ${result.rejectionReason || 'Confidence score below threshold'}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getVoiceprintStatus(req, res, next) {
    try {
      const userId = req.params.userId || req.user?.id;
      const result = await biometricVaultService.getVoiceprintStatus(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async enrollCredential(req, res, next) {
    try {
      const userId = req.body.userId || req.user?.id;
      const result = await biometricVaultService.enrollSecurityCredential(userId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Biometric security credential registered.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserCredentials(req, res, next) {
    try {
      const userId = req.params.userId || req.user?.id;
      const result = await biometricVaultService.getUserCredentials(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getSecurityPolicy(req, res, next) {
    try {
      const result = await biometricVaultService.getBiometricSecurityPolicy();
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSecurityPolicy(req, res, next) {
    try {
      const result = await biometricVaultService.updateBiometricSecurityPolicy(req.body);
      return res.status(200).json({
        success: true,
        message: 'Biometric security policy updated.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getVerificationLogs(req, res, next) {
    try {
      const limit = req.query.limit || 20;
      const result = await biometricVaultService.getVerificationAuditLogs(limit);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getTelemetry(req, res, next) {
    try {
      const result = await biometricVaultService.getBiometricsTelemetry();
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BiometricVaultController();
