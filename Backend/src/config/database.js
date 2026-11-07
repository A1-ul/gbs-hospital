'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE CONFIGURATION

Production Hardened
CommonJS Only

LOCATION:
backend/src/config/database.js

====================================================
*/


const {
    connectWithRetry,
    disconnectDatabase,
    checkDatabaseConnection
} = require('../core/database/prisma.connection');


const logger =
    require('../core/utils/logger');



let initialized = false;



/**
 * Start database connection
 * Called during application startup
 */
async function connectDatabase() {


    if (initialized) {


        logger.warn({

            message:
                'Database already initialized'

        });


        return true;

    }



    try {


        logger.info({

            message:
                'Starting database initialization'

        });



        await connectWithRetry();



        initialized = true;



        logger.info({

            message:
                'Database initialization completed',

            database:
                'PostgreSQL',

            status:
                'CONNECTED'

        });



        return true;



    }
    catch(error) {


        logger.error({

            message:
                'Database initialization failed',

            error: {

                message:
                    error.message,

                stack:
                    error.stack

            }

        });



        initialized = false;


        throw error;


    }

}



/**
 * Shutdown database connection
 */
async function disconnect() {


    try {


        await disconnectDatabase();


        initialized = false;



        logger.info({

            message:
                'Database disconnected'

        });


    }
    catch(error) {


        logger.error({

            message:
                'Database shutdown failed',

            error: {

                message:
                    error.message

            }

        });



        throw error;


    }

}





module.exports = Object.freeze({

    connectDatabase,

    disconnectDatabase,

    checkDatabaseConnection

});