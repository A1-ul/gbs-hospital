'use strict';

const environment = require('./environment');

const appConfig = {
  name: 'GBS Hospital Management System',

  version: '1.0.0',

  environment: environment.current,

  host: process.env.HOST || '0.0.0.0',

  port: Number(process.env.PORT || 5000),

  api: {
    prefix: '/api',
    version: 'v1'
  },

  timezone:
    process.env.TIMEZONE ||
    'UTC',

  maintenance:
    process.env.MAINTENANCE_MODE === 'true',

  shutdownTimeout:
    Number(
      process.env.SHUTDOWN_TIMEOUT || 30000
    ),

  requestTimeout:
    Number(
      process.env.REQUEST_TIMEOUT || 30000
    )
};


module.exports = Object.freeze(appConfig);