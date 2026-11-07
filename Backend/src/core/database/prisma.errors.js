'use strict';

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA ERROR CLASSIFICATION LAYER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.errors.js

====================================================
*/


const logger =
    require('../utils/logger');


const AppError =
    require('../errors/app.error');







const PRISMA_ERRORS =
Object.freeze({


    P2000:Object.freeze({

        statusCode:400,

        code:'VALUE_TOO_LONG',

        message:
            'Provided value is too long'

    }),




    P2002:Object.freeze({

        statusCode:409,

        code:'DUPLICATE_RECORD',

        message:
            'A record with this information already exists'

    }),




    P2003:Object.freeze({

        statusCode:400,

        code:'INVALID_REFERENCE',

        message:
            'Related record does not exist'

    }),




    P2014:Object.freeze({

        statusCode:400,

        code:'RELATION_ERROR',

        message:
            'Invalid database relationship'

    }),




    P2016:Object.freeze({

        statusCode:400,

        code:'QUERY_ERROR',

        message:
            'Database query failed'

    }),




    P2021:Object.freeze({

        statusCode:500,

        code:'DATABASE_TABLE_ERROR',

        message:
            'Database structure error'

    }),




    P2022:Object.freeze({

        statusCode:500,

        code:'DATABASE_COLUMN_ERROR',

        message:
            'Database structure error'

    }),




    P2024:Object.freeze({

        statusCode:503,

        code:'DATABASE_POOL_TIMEOUT',

        message:
            'Database connection timeout'

    }),




    P2025:Object.freeze({

        statusCode:404,

        code:'RECORD_NOT_FOUND',

        message:
            'Requested record was not found'

    }),




    P1001:Object.freeze({

        statusCode:503,

        code:'DATABASE_UNAVAILABLE',

        message:
            'Database service unavailable'

    }),




    P1008:Object.freeze({

        statusCode:503,

        code:'DATABASE_TIMEOUT',

        message:
            'Database operation timeout'

    }),




    P2034:Object.freeze({

        statusCode:409,

        code:'TRANSACTION_CONFLICT',

        message:
            'Database transaction conflict'

    })

});









function isPrismaError(error){


    return Boolean(

        error &&

        typeof error.code === 'string' &&

        /^P\d+$/.test(error.code)

    );


}









function handlePrismaError(error){



    if(
        !isPrismaError(error)
    ){

        return error;

    }







    const mapped =
        PRISMA_ERRORS[error.code];






    logger.error({


        message:
            'Prisma database error',


        prismaCode:
            error.code,


        meta:
            process.env.NODE_ENV === 'production'

                ? null

                : error.meta || null


    });









    if(
        !mapped
    ){


        return new AppError(

            'Database operation failed',

            500,

            'DATABASE_ERROR'

        );


    }






    return new AppError(

        mapped.message,

        mapped.statusCode,

        mapped.code

    );


}









function getPrismaErrorResponse(error){



    const handled =
        handlePrismaError(error);






    return Object.freeze({


        statusCode:
            handled.statusCode || 500,


        code:
            handled.code ||
            'DATABASE_ERROR',


        message:
            handled.message ||
            'Database error'


    });


}









module.exports = {


    isPrismaError,


    handlePrismaError,


    getPrismaErrorResponse


};