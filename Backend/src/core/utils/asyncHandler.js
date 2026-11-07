"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

ASYNC ERROR HANDLER WRAPPER

Production Hardened
CommonJS Only

LOCATION:
src/core/utils/asyncHandler.js

====================================================
*/


const logger =
    require("./logger");





function asyncHandler(fn){



    if(
        typeof fn !== "function"
    ){

        throw new TypeError(
            "asyncHandler requires a function"
        );

    }







    return function(

        req,

        res,

        next

    ){



        Promise

            .resolve(
                fn(
                    req,
                    res,
                    next
                )
            )

            .catch(error=>{



                logger.error({


                    message:
                        "Async request failure",


                    error:{
                        name:
                            error.name,

                        message:
                            error.message,

                        code:
                            error.code || null

                    },


                    path:
                        req.originalUrl || null,


                    method:
                        req.method || null,


                    requestId:
                        req.requestId || null



                });



                next(error);



            });



    };



}







module.exports =
    asyncHandler;