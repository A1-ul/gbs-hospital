"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

JWT SECURITY SERVICE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/security/jwt.js

====================================================
*/


const jwt =
    require("jsonwebtoken");


const AppError =
    require("../errors/app.error");


const logger =
    require("../utils/logger");



const {
    environment
} =
require("../../config/environment");







const JWT_ALGORITHM =
    "HS256";



const JWT_ISSUER =
    environment.JWT_ISSUER ||
    "GBS-HOSPITAL-SYSTEM";



const JWT_AUDIENCE =
    environment.JWT_AUDIENCE ||
    "GBS-HOSPITAL-CLIENT";








function getSecret(){



    if(
        !environment.JWT_SECRET
    ){


        throw new AppError(

            "JWT secret configuration missing",

            500,

            "JWT_CONFIGURATION_ERROR"

        );


    }



    return environment.JWT_SECRET;


}









function generateToken(payload){



    if(
        !payload ||
        typeof payload !== "object"
    ){


        throw new AppError(

            "Invalid token payload",

            400,

            "JWT_PAYLOAD_INVALID"

        );


    }






    try{



        return jwt.sign(


            payload,


            getSecret(),


            {


                algorithm:
                    JWT_ALGORITHM,


                expiresIn:

                    environment.JWT_EXPIRE ||

                    "1h",



                issuer:
                    JWT_ISSUER,



                audience:
                    JWT_AUDIENCE



            }



        );



    }


    catch(error){



        logger.error({


            message:
                "JWT generation failed",


            error:{
                message:
                    error.message
            }



        });



        throw error;


    }



}









function verifyToken(token){



    if(
        !token ||
        typeof token !== "string"
    ){


        throw new AppError(

            "Invalid authentication token",

            401,

            "TOKEN_INVALID"

        );


    }







    try{



        return jwt.verify(


            token,


            getSecret(),


            {


                algorithms:[

                    JWT_ALGORITHM

                ],


                issuer:
                    JWT_ISSUER,


                audience:
                    JWT_AUDIENCE



            }



        );



    }


    catch(error){



        logger.warn({


            message:
                "JWT verification failed",


            error:{
                name:
                    error.name,

                message:
                    error.message

            }



        });





        if(
            error.name === "TokenExpiredError"
        ){


            throw new AppError(

                "Authentication token expired",

                401,

                "TOKEN_EXPIRED"

            );


        }






        throw new AppError(

            "Invalid authentication token",

            401,

            "TOKEN_INVALID"

        );



    }



}









function decodeToken(token){



    try{


        return jwt.decode(token);



    }

    catch(error){


        return null;


    }


}

module.exports = {


    generateToken,


    verifyToken,


    decodeToken


};