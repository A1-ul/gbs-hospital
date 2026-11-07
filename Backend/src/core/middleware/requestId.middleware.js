"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

REQUEST ID MIDDLEWARE

Production Hardened
CommonJS Only

LOCATION:
src/core/middleware/requestId.middleware.js

====================================================
*/


const logger =
    require("../utils/logger");



let generateId;



try {


    const uuid =
        require("uuid");


    generateId =
        uuid.v4;



}
catch(error){



    generateId =
        function(){


            return (

                Date.now()
                .toString(36)

                +

                Math.random()
                .toString(36)
                .substring(2)

            );


        };


}







module.exports =
function requestIdMiddleware(

    req,

    res,

    next

){


    try{



        const requestId =


            req.headers["x-request-id"]

            ||

            generateId();






        req.requestId =
            requestId;






        res.setHeader(

            "X-Request-ID",

            requestId

        );





        next();



    }

    catch(error){



        logger.error({


            message:
                "Request ID middleware failed",


            error:{
                message:
                    error.message
            }



        });



        next(error);



    }



};