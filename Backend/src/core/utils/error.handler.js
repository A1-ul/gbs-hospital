'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

CENTRAL ERROR HANDLER UTILITY

Production Hardened
CommonJS Only

LOCATION:
src/core/utils/error.handler.js

====================================================
*/


const logger =
    require('./logger');


const ERROR_CODES =
    require('./error.codes');



const AppError =
    require('../errors/app.error');



let handlePrismaError;


try {

    ({
        handlePrismaError
    } =
    require('../database/prisma.errors'));


}
catch(error){


    handlePrismaError =
        function(err){

            return err;

        };

}







function normalizeError(error){


    if(!error){

        return {

            name:
                'UnknownError',

            message:
                'Unknown error'

        };

    }



    return {


        name:
            error.name || 'Error',


        message:
            error.message || 'Unknown error',


        code:
            error.code || null,


        stack:
            error.stack || null


    };


}









function classifyError(error){


    if(
        error instanceof AppError
    ){

        return error;

    }




    if(
        error.statusCode
    ){

        return new AppError(

            error.message,

            error.statusCode,

            error.code ||
            ERROR_CODES.GENERAL_ERROR

        );

    }





    return new AppError(

        'Internal server error',

        500,

        ERROR_CODES.SERVER_ERROR

    );


}









function safeLog(data){


    try{


        logger.error(data);


    }

    catch(error){


        console.error(
            data
        );


    }


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






    let normalizedError =
        error;



    /*
    Prisma conversion
    */


    try{


        normalizedError =
            handlePrismaError(
                normalizedError
            );


    }
    catch(prismaError){


        safeLog({

            message:
                'Prisma error conversion failed',

            error:
                prismaError.message

        });


    }






    const appError =
        classifyError(
            normalizedError
        );








    const isProduction =
        process.env.NODE_ENV === 'production';






    safeLog({


        message:
            'Application error',


        code:
            appError.code,


        statusCode:
            appError.statusCode,



        request:{


            method:
                req.method,


            url:
                req.originalUrl,


            requestId:
                req.requestId || null,


            ip:
                req.ip || null


        },



        error:
            normalizeError(error)


    });









    return res

        .status(
            appError.statusCode
        )

        .json({



            success:false,



            error:{


                code:
                    appError.code,



                message:


                    isProduction &&
                    appError.statusCode >= 500

                    ?

                    'Internal server error'

                    :

                    appError.message



            },



            requestId:
                req.requestId || null,



            timestamp:
                new Date()
                    .toISOString()



        });



}






module.exports =
    errorHandler;