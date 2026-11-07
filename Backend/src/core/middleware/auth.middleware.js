"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

AUTHENTICATION MIDDLEWARE

Production Hardened
CommonJS Only

LOCATION:
src/core/middleware/auth.middleware.js

====================================================
*/


const jwt =
require("jsonwebtoken");


const AppError =
require("../errors/app.error");


const logger =
require("../utils/logger");








const JWT_OPTIONS =
Object.freeze({

    algorithms:[
        "HS256"
    ]

});









function extractToken(req){


    const authorization =
        req.headers.authorization;



    if(

        !authorization

        ||

        typeof authorization !== "string"

    ){

        return null;

    }





    if(

        !authorization.startsWith("Bearer ")

    ){

        return null;

    }





    const token =
        authorization
        .slice(7)
        .trim();





    if(

        !token

        ||

        token.length > 4096

    ){

        return null;

    }




    return token;


}









function verifyToken(token){



    if(
        !process.env.JWT_SECRET
    ){

        throw new AppError(

            "Authentication service unavailable",

            500,

            "JWT_CONFIGURATION_ERROR"

        );

    }






    try{


        return jwt.verify(

            token,

            process.env.JWT_SECRET,

            JWT_OPTIONS

        );


    }


    catch(error){



        if(

            error.name === "TokenExpiredError"

        ){

            throw new AppError(

                "Authentication token expired",

                401,

                "TOKEN_EXPIRED"

            );

        }






        if(

            error.name === "JsonWebTokenError"

        ){

            throw new AppError(

                "Invalid authentication token",

                401,

                "TOKEN_INVALID"

            );

        }





        throw new AppError(

            "Authentication failed",

            401,

            "AUTH_FAILED"

        );


    }



}









module.exports =

function authMiddleware(

    req,

    res,

    next

){



    try{


        const token =
            extractToken(req);





        if(!token){


            throw new AppError(

                "Authentication required",

                401,

                "AUTH_REQUIRED"

            );


        }







        const user =
            verifyToken(token);






        if(

            !user

            ||

            typeof user !== "object"

        ){

            throw new AppError(

                "Invalid authentication token",

                401,

                "TOKEN_INVALID"

            );

        }








        req.user =
            Object.freeze(user);





        next();



    }


    catch(error){



        try{


            logger.error({


                message:
                    "Authentication failed",


                code:
                    error.code || "AUTH_FAILED",


                statusCode:
                    error.statusCode || 500,


                path:
                    req.originalUrl,


                method:
                    req.method



            });



        }


        catch(loggingError){


            console.error(

                "AUTH LOGGER FAILURE",

                loggingError.message

            );


        }






        next(error);



    }


};