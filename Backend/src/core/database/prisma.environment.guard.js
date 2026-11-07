'use strict';

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA ENVIRONMENT GUARD

PRODUCTION DATABASE SAFETY

COMMONJS ONLY

LOCATION:
src/core/database/prisma.environment.guard.js

====================================================
*/


const logger =
    require('../utils/logger');


const {
    environment
} =
require('../../config/environment');







function validateDatabaseUrl(url){


    if(
        !url ||
        typeof url !== 'string'
    ){

        return false;

    }



    return url.trim().length > 0;


}









function parseDatabaseHost(url){


    try{


        const parsed =
            new URL(url);



        return {


            host:
                parsed.hostname
                    .toLowerCase(),


            database:
                parsed.pathname
                    .replace('/','')
                    .toLowerCase()


        };


    }

    catch(error){


        return {


            host:'',


            database:''


        };


    }


}









function checkProductionSafety(databaseUrl){



    const {

        host,

        database

    } =
    parseDatabaseHost(
        databaseUrl
    );






    const blockedHosts = [


        'localhost',


        '127.0.0.1',


        '0.0.0.0'


    ];






    const blockedDatabases = [


        'test',


        'development',


        'dev'


    ];







    if(
        blockedHosts.includes(host)
    ){

        throw new Error(

            `Production database host blocked: ${host}`

        );

    }






    if(
        blockedDatabases.includes(database)
    ){

        throw new Error(

            `Production database name blocked: ${database}`

        );

    }



}









function checkDatabaseEnvironment(){



    try{


        const databaseUrl =
            environment.DATABASE_URL;






        if(
            !validateDatabaseUrl(
                databaseUrl
            )
        ){

            throw new Error(
                'DATABASE_URL is missing or invalid'
            );

        }








        if(
            environment.IS_PRODUCTION
        ){

            checkProductionSafety(
                databaseUrl
            );

        }







        logger.info({


            message:
                'Database environment validated',


            database:
                'PostgreSQL',


            environment:
                environment.NODE_ENV


        });






        return true;



    }


    catch(error){


        logger.error({


            message:
                'Database environment validation failed',


            error:{
                message:
                    error.message
            }


        });



        throw error;



    }


}








module.exports =
    checkDatabaseEnvironment;