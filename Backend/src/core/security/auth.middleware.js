"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SECURITY AUTHENTICATION MIDDLEWARE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/security/auth.middleware.js

====================================================
*/


const jwt =
    require("jsonwebtoken");


const AppError =
    require("../errors/app.error");


const logger =
    require("../utils/logger");









function extractToken(req){



    const header =
        req.headers.authorization;



    if(
        !header ||
        typeof header !== "string"
    ){

        return null;

    }



    if(
        !header.startsWith("Bearer ")
    ){

        return null;

    }



    return header

        .substring(7)

        .trim();


}









function verifyToken(token){



    if(
        !process.env.JWT_SECRET
    ){


        throw new AppError(

            "Authentication configuration unavailable",

            500,

            "JWT_CONFIGURATION_ERROR"

        );


    }





    try{


        return jwt.verify(

            token,

            process.env.JWT_SECRET

        );



    }


    catch(error){



        if(
            error.name === "TokenExpiredError"
        ){


            throw new AppError(

                "Token expired",

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




        throw error;



    }



}









module.exports =

function authenticate(

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






        const decoded =
            verifyToken(token);





        if(
            !decoded ||
            typeof decoded !== "object"
        ){


            throw new AppError(

                "Invalid token payload",

                401,

                "TOKEN_INVALID"

            );


        }





        req.user =
            Object.freeze(decoded);





        next();




    }


    catch(error){



        logger.warn({


            message:
                "Security authentication failed",


            code:
                error.code || null,


            path:
                req.originalUrl,


            error:{
                message:
                    error.message
            }



        });




        next(error);



    }



};