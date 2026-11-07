"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

GLOBAL ERROR HANDLER

Production Hardened
CommonJS Only

LOCATION:
src/core/errors/error.handler.js

====================================================
*/


const ERROR_CODES =
require("./error.codes");


const logger =
require("../utils/logger");


const {
    environment
} =
require("../../config/environment");







function normalizeError(error){


    if(!error){


        return {

            name:
            "UnknownError",

            message:
            "Unknown error",

            code:
            null,

            stack:
            null

        };


    }



    return {


        name:
            error.name || "Error",


        message:
            error.message || "Unknown error",


        code:
            error.code || null,


        statusCode:
            error.statusCode || null,


        stack:
            error.stack || null


    };


}









function getStatusCode(error){


    const status =
        Number(error.statusCode);



    if(

        Number.isInteger(status)

        &&

        status >= 400

        &&

        status <= 599

    ){

        return status;

    }



    return 500;


}









function getErrorCode(error){


    return (

        error.code

        ||

        ERROR_CODES.INTERNAL_ERROR

    );


}









function getMessage(

    error,

    statusCode

){



    if(

        environment.IS_PRODUCTION

        &&

        statusCode >= 500

    ){

        return "Internal Server Error";


    }




    return (

        error.message

        ||

        "Internal Server Error"

    );


}









function errorHandler(

    error,

    req,

    res,

    next

){



    if(
        res.headersSent
    ){

        return next(error);

    }






    const statusCode =
        getStatusCode(error);




    const code =
        getErrorCode(error);




    const message =
        getMessage(

            error,

            statusCode

        );









    try{


        logger.error({



            message:
                "Application error",



            code,



            statusCode,



            request:{


                method:
                    req.method,


                url:
                    req.originalUrl,


                requestId:
                    req.requestId || null


            },



            error:
                normalizeError(error)



        });



    }


    catch(loggerError){


        console.error(

            "ERROR HANDLER LOGGER FAILURE",

            loggerError.message

        );


    }









    return res

        .status(statusCode)

        .json({



            success:
                false,



            error:{



                code,



                message



            },



            meta:{



                timestamp:
                    new Date()
                    .toISOString(),



                requestId:
                    req.requestId || null



            }



        });



}








module.exports =
    errorHandler;