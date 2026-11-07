"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

GLOBAL ERROR HANDLER

Production Hardened
CommonJS Only

LOCATION:
src/core/middleware/error.middleware.js

====================================================
*/


const AppError =
    require("../errors/app.error");


const logger =
    require("../utils/logger");



let handlePrismaError;



try {


    ({
        handlePrismaError
    } =
    require("../database/prisma.errors"));


}
catch(error){


    handlePrismaError =
        function(err){

            return err;

        };


}





function normalizeError(error){
    if(
        error instanceof AppError
    ){
        return error;
    }

    if(
        error &&
        typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
    ){
        const normalized =
            new AppError(
                error.message || "Application Error",
                error.statusCode,
                error.code || (error.statusCode === 404 ? "NOT_FOUND" : (error.statusCode === 400 ? "VALIDATION_ERROR" : "APPLICATION_ERROR")),
                error.details || null
            );
        normalized.originalError =
            error;
        return normalized;
    }

    const normalized =
        new AppError(
            "Internal server error",
            500,
            "INTERNAL_ERROR"
        );

    normalized.originalError =
        error;

    return normalized;
}









function safeLog(payload){


    try{


        logger.error(payload);


    }

    catch(error){


        console.error(
            payload
        );


    }


}









function errorMiddleware(

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






    let err =
        error;






    /*
    Prisma conversion
    */


    try{


        err =
        handlePrismaError(err);


    }

    catch(prismaError){


        safeLog({

            message:
                "Prisma error conversion failed",

            error:
                prismaError.message

        });


    }






    err =
        normalizeError(err);








    safeLog({


        message:
            err.message,


        code:
            err.code,


        statusCode:
            err.statusCode,


        method:
            req.method,


        url:
            req.originalUrl,


        requestId:
            req.requestId || null,


        stack:
            err.stack



    });









    const production =
        process.env.NODE_ENV === "production";





    const responseMessage =


        production &&
        err.statusCode >= 500

        ?

        "Internal server error"

        :

        err.message;









    return res

        .status(
            err.statusCode || 500
        )

        .json({


            success:false,
            message:responseMessage,

            error:{


                code:
                    err.code ||
                    "INTERNAL_ERROR",


                message:
                    responseMessage,


                requestId:
                    req.requestId || null


            }


        });



}







module.exports =
    errorMiddleware;