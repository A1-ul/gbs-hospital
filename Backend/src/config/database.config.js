'use strict';


const databaseConfig = {


  provider:
    'postgresql',


  url:
    process.env.DATABASE_URL,


  pool: {

    max:
      Number(
        process.env.DB_POOL_MAX || 20
      ),

    min:
      Number(
        process.env.DB_POOL_MIN || 2
      )

  },


  retry: {

    attempts:
      Number(
        process.env.DB_RETRY || 5
      ),


    delay:
      Number(
        process.env.DB_RETRY_DELAY || 3000
      )

  },


  logging:
    process.env.DB_LOGGING === 'true'

};


module.exports = Object.freeze(databaseConfig);