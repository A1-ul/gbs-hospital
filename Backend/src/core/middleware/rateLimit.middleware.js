"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

RATE LIMIT SECURITY MIDDLEWARE

Production Hardened
CommonJS Only

LOCATION:
src/core/middleware/rateLimit.middleware.js

====================================================
*/


let rateLimit;


try{


    rateLimit =
        require("express-rate-limit");


}
catch(error){


    module.exports =
    function(){

        return function(

            req,

            res,

            next

        ){

            next();

        };

    };


    return;

}







const logger =
require("../utils/logger");









const windowMs =


    Number(
        process.env.RATE_LIMIT_WINDOW
    )

    ||

    15 * 60 * 1000;






const maxRequests =


    Number(
        process.env.RATE_LIMIT_MAX
    )

    ||

    100;









const limiter =


rateLimit({



    windowMs,



    max:
        maxRequests,




    standardHeaders:
        true,




    legacyHeaders:
        false,




    message:{


        success:false,


        error:{


            code:
                "RATE_LIMIT_EXCEEDED",


            message:
                "Too many requests, please try again later"


        }


    },





    handler(

        req,

        res,

        next,

        options

    ){



        logger.warn({


            message:
            "Rate limit exceeded",



            ip:
            req.ip,



            path:
            req.originalUrl



        });





        res

        .status(
            options.statusCode
        )

        .json(
            options.message
        );


    }




});







module.exports =
limiter;