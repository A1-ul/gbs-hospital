'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

LOGGER CONFIGURATION

Production Hardened
CommonJS Only

Location:
backend/src/config/logger.js

====================================================
*/

const winston = require('winston');

const {
    environment
} = require('./environment');



const NODE_ENV =
    environment.NODE_ENV ||
    'development';


const LOG_LEVEL =
    environment.LOG_LEVEL ||
    'info';



const isProduction =
    NODE_ENV === 'production';



const format =
    winston.format;



/*
====================================================
SENSITIVE DATA PROTECTION

Prevents accidental logging of:
- passwords
- tokens
- secrets
- authorization data

====================================================
*/

const sensitiveFields = [

    'password',

    'token',

    'accessToken',

    'refreshToken',

    'authorization',

    'secret',

    'jwt'

];



function sanitize(data = {}) {


    const clean = {
        ...data
    };


    sensitiveFields.forEach((field)=>{


        if(clean[field]) {


            clean[field] =
                '[REDACTED]';


        }


    });



    return clean;

}





/*
====================================================
LOGGER INSTANCE

====================================================
*/

const logger =
    winston.createLogger({


        level:
            LOG_LEVEL,



        format:
            format.combine(


                format.timestamp(),


                format.errors({

                    stack:true

                })


            ),



        transports:[

            new winston.transports.Console({

                format:

                    isProduction

                    ?

                    format.combine(

                        format.json()

                    )

                    :

                    format.combine(

                        format.colorize(),

                        format.simple()

                    )


            })

        ],



        exitOnError:false


    });







/*
====================================================
SAFE LOGGER WRAPPER

Prevents logging failures
from crashing application

====================================================
*/

function writeLog(
    level,
    message,
    meta={}
){


    try {


        logger.log({


            level,


            message,


            ...sanitize(meta)


        });


    }

    catch(error){


        console.error(

            'LOGGER FAILURE:',

            error.message

        );


    }


}





/*
====================================================
PUBLIC LOGGER API

====================================================
*/

module.exports = {



    info(
        message,
        meta={}
    ){

        writeLog(

            'info',

            message,

            meta

        );

    },




    warn(
        message,
        meta={}
    ){

        writeLog(

            'warn',

            message,

            meta

        );

    },




    error(
        message,
        meta={}
    ){

        writeLog(

            'error',

            message,

            meta

        );

    },




    debug(
        message,
        meta={}
    ){

        writeLog(

            'debug',

            message,

            meta

        );

    },





    stream:{


        write(message){


            writeLog(

                'info',

                String(message).trim()

            );


        }


    },




    raw:
        logger


};