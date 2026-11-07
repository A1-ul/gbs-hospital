"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

REQUEST VALIDATION MIDDLEWARE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/middleware/validation.middleware.js

====================================================
*/


const logger =
    require("../utils/logger");



const AppError =
    require("../errors/app.error");







const ALLOWED_SOURCES =
Object.freeze([

    "body",

    "query",

    "params",

    "headers"

]);








function normalizeSource(source){


    if(

        !ALLOWED_SOURCES.includes(source)

    ){

        return "body";

    }


    return source;


}









function extractMessages(error){


    if(

        !error

    ){

        return [];

    }






    if(

        Array.isArray(error.details)

    ){


        return error.details.map(

            item =>

                item.message ||
                "Invalid value"

        );


    }







    if(

        error.message

    ){

        return [

            error.message

        ];

    }






    return [

        "Validation failed"

    ];



}

function isValidSchema(schema){


    return (

        schema &&

        typeof schema.validate === "function"

    );

}

function validate(

    schema,

    source = "body"

){


    const requestSource =
        normalizeSource(source);

    return function validationMiddleware(

        req,

        res,

        next

    ){


        try{

            if(

                !isValidSchema(schema)

            ){



                logger.error({


                    message:
                        "Validation schema invalid",


                    path:
                        req.originalUrl,


                    source:
                        requestSource



                });





                return next(

                    new AppError(

                        "Validation configuration error",

                        500,

                        "VALIDATION_CONFIGURATION_ERROR"

                    )

                );



            }

            const data =

                req[requestSource] || {};

            const result =

                schema.validate(

                    data,

                    {


                        abortEarly:false,


                        stripUnknown:true,


                        convert:true



                    }

                );

            if(

                result.error

            ){

                const messages =

                    extractMessages(

                        result.error

                    );







                logger.warn({



                    message:

                        "Request validation failed",



                    method:

                        req.method,



                    path:

                        req.originalUrl,



                    source:

                        requestSource,



                    errors:

                        messages,



                    requestId:

                        req.requestId || null



                });

                const production =

                    process.env.NODE_ENV ===

                    "production";

                return res

                .status(400)

                .json({



                    success:false,



                    error:{



                        code:

                            "VALIDATION_ERROR",



                        message:

                            "Invalid request data",




                        details:

                            production

                            ? []

                            : messages,




                        requestId:

                            req.requestId || null



                    }



                });

            }

            /*
            Replace input with sanitized data
            */


            req[requestSource] =

                result.value;

            next();

        }

        catch(error){

            logger.error({



                message:

                    "Validation middleware failure",



                error:{


                    message:

                        error.message,


                    name:

                        error.name



                },



                path:

                    req.originalUrl



            });







            next(error);




        }



    };



}

module.exports =
    validate;