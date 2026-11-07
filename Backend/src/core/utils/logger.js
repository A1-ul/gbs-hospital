"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

CENTRAL LOGGER SERVICE

Production Hardened
CommonJS Only

LOCATION:
src/utils/logger.js

====================================================
*/


const winston =
    require("winston");


const path =
    require("path");


const fs =
    require("fs");






const environment =
    process.env.NODE_ENV || "development";



const isProduction =
    environment === "production";



const logLevel =
    process.env.LOG_LEVEL || "info";








/*
====================================================
LOG DIRECTORY
====================================================
*/


const LOG_DIRECTORY =
    path.join(

        process.cwd(),

        "storage",

        "logs"

    );





if(
    !fs.existsSync(LOG_DIRECTORY)
){

    fs.mkdirSync(

        LOG_DIRECTORY,

        {
            recursive:true
        }

    );

}









/*
====================================================
SENSITIVE DATA MASKING
====================================================
*/


const SENSITIVE_KEYS = [

    "password",

    "token",

    "authorization",

    "jwt",

    "secret",

    "apikey",

    "apiKey",

    "database_url",

    "DATABASE_URL"

];








function sanitize(value){



    if(
        !value
    ){

        return value;

    }






    if(
        Array.isArray(value)
    ){

        return value.map(
            sanitize
        );

    }








    if(
        typeof value === "object"
    ){


        const output = {};



        Object.keys(value)
            .forEach(key=>{


                if(
                    SENSITIVE_KEYS.includes(
                        key
                    )
                ){

                    output[key] =
                        "[REDACTED]";


                }
                else{


                    output[key] =
                        sanitize(
                            value[key]
                        );


                }


            });



        return output;


    }





    return value;


}









/*
====================================================
FORMAT
====================================================
*/


const format =
    winston.format.combine(


        winston.format.timestamp(),


        winston.format.errors({

            stack:true

        }),



        winston.format.json()



    );









/*
====================================================
TRANSPORTS
====================================================
*/


const transports = [

    new winston.transports.Console()

];





if(
    isProduction
){

    transports.push(


        new winston.transports.File({

            filename:
                path.join(

                    LOG_DIRECTORY,

                    "application.log"

                ),


            maxsize:
                10 * 1024 * 1024,


            maxFiles:
                5


        })

    );


}









const logger =
    winston.createLogger({


        level:
            logLevel,


        format,


        transports,


        exitOnError:false


    });









/*
====================================================
NORMALIZER
====================================================
*/


function normalize(

    message,

    meta

){



    let payload;





    if(

        typeof message === "object" &&
        message !== null

    ){


        payload =
        {

            ...message

        };


    }

    else{


        payload =
        {

            message:
                String(message || "")


        };


    }






    if(meta){


        payload =
        {

            ...payload,

            ...meta

        };


    }






    return sanitize(payload);



}









function write(

    level,

    message,

    meta

){


    try{


        logger.log(

            level,

            normalize(

                message,

                meta

            )

        );


    }

    catch(error){


        console.error(

            "LOGGER FAILURE",

            error.message

        );


    }


}









/*
====================================================
GLOBAL PROCESS ERROR CAPTURE
====================================================
*/


process.on(

    "uncaughtException",

    error=>{


        write(

            "error",

            {

                message:
                    "UNCAUGHT_EXCEPTION",

                error:{
                    message:
                        error.message,

                    stack:
                        error.stack

                }

            }

        );


    }

);







process.on(

    "unhandledRejection",

    reason=>{


        write(

            "error",

            {

                message:
                    "UNHANDLED_REJECTION",

                error:
                    reason

            }

        );


    }

);









module.exports = {


    info(

        message,

        meta

    ){

        write(

            "info",

            message,

            meta

        );

    },





    warn(

        message,

        meta

    ){

        write(

            "warn",

            message,

            meta

        );

    },





    error(

        message,

        meta

    ){

        write(

            "error",

            message,

            meta

        );

    },





    debug(

        message,

        meta

    ){

        write(

            "debug",

            message,

            meta

        );

    },





    stream:{


        write(message){


            write(

                "info",

                String(message).trim()

            );


        }


    },





    raw:
        logger



};