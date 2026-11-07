'use strict';

const dotenv = require('dotenv');

dotenv.config();


const NODE_ENV =
    process.env.NODE_ENV || 'development';


const allowedEnvironments = [
    'development',
    'test',
    'production'
];


if (!allowedEnvironments.includes(NODE_ENV)) {

    throw new Error(
        `Invalid NODE_ENV: ${NODE_ENV}`
    );

}



function getBoolean(value, fallback = false) {

    if (value === undefined) {
        return fallback;
    }

    return String(value).toLowerCase() === 'true';

}



function getPort(value, fallback = 5000) {

    const port = Number(value);

    if (!Number.isInteger(port)) {
        return fallback;
    }

    return port;

}




const environment = Object.freeze({

    NODE_ENV,


    IS_DEVELOPMENT:
        NODE_ENV === 'development',


    IS_TEST:
        NODE_ENV === 'test',


    IS_PRODUCTION:
        NODE_ENV === 'production',



    PORT:
        getPort(
            process.env.PORT
        ),



    HOST:
        process.env.HOST || '0.0.0.0',



    DATABASE_URL:
        process.env.DATABASE_URL || null,



    JWT_SECRET:
        process.env.JWT_SECRET || null,



    JWT_EXPIRE:
        process.env.JWT_EXPIRE || '24h',



    CORS_ORIGIN:
        process.env.CORS_ORIGIN || '*',



    LOG_LEVEL:
        process.env.LOG_LEVEL || 'info',



    TIMEZONE:
        process.env.TIMEZONE || 'UTC',



    DEBUG:
        getBoolean(
            process.env.DEBUG,
            NODE_ENV === 'development'
        ),



    SECURITY: Object.freeze({

        STRICT_COOKIES:
            NODE_ENV === 'production',


        ENABLE_RATE_LIMIT:
            NODE_ENV !== 'test',


        EXPOSE_ERRORS:
            NODE_ENV === 'development'


    })

});





function validateEnvironment() {

    const required = [
        'DATABASE_URL',
        'JWT_SECRET'
    ];


    const missing = [];


    required.forEach((key) => {

        if (
            !environment[key] ||
            String(environment[key]).trim() === ''
        ) {

            missing.push(key);

        }

    });



    if (missing.length) {

        throw new Error(
            `Missing environment variables: ${missing.join(', ')}`
        );

    }



    if (
        environment.IS_PRODUCTION &&
        environment.JWT_SECRET.length < 32
    ) {

        throw new Error(
            'Production JWT_SECRET must contain at least 32 characters'
        );

    }



    if (
        environment.PORT < 1 ||
        environment.PORT > 65535
    ) {

        throw new Error(
            'Invalid PORT configuration'
        );

    }



    return true;

}





function getEnvironmentInfo() {

    return Object.freeze({

        environment:
            environment.NODE_ENV,


        host:
            environment.HOST,


        port:
            environment.PORT,


        production:
            environment.IS_PRODUCTION,


        development:
            environment.IS_DEVELOPMENT,


        test:
            environment.IS_TEST

    });

}

module.exports = {

    environment,

    validateEnvironment,

    getEnvironmentInfo

};