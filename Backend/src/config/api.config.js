'use strict';


const apiConfig = {

  prefix:
    process.env.API_PREFIX || '/api',

  version:
    process.env.API_VERSION || 'v1',


  pagination: {

    defaultLimit:
      Number(process.env.DEFAULT_LIMIT || 20),

    maxLimit:
      Number(process.env.MAX_LIMIT || 100)

  },


  rateLimit: {

    windowMs:
      Number(
        process.env.RATE_LIMIT_WINDOW || 900000
      ),

    maxRequests:
      Number(
        process.env.RATE_LIMIT_MAX || 300
      )

  },


  cors: {

    origin:
      process.env.CORS_ORIGIN || '*',

    credentials:
      true

  }

};


module.exports = Object.freeze(apiConfig);