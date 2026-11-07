"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PERMISSION AUTHORIZATION MIDDLEWARE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/security/permission.middleware.js

====================================================
*/


const AppError =
    require("../errors/app.error");


const logger =
    require("../utils/logger");







function authorizePermission(permission){



    if(
        typeof permission !== "string" ||
        permission.trim().length === 0
    ){


        throw new Error(
            "Permission name is required"
        );


    }







    return function(

        req,

        res,

        next

    ){



        try{



            if(
                !req.user
            ){


                return next(

                    new AppError(

                        "Authentication required",

                        401,

                        "AUTH_REQUIRED"

                    )

                );


            }








            const permissions =

                Array.isArray(
                    req.user.permissions
                )

                ?

                req.user.permissions

                :

                [];








            if(
                !permissions.includes(permission)
            ){



                logger.warn({


                    message:
                        "Permission denied",


                    permission,


                    user:
                        req.user.id || null,


                    path:
                        req.originalUrl



                });





                return next(

                    new AppError(

                        "Permission denied",

                        403,

                        "INSUFFICIENT_PERMISSION",

                        {

                            required:
                                permission

                        }

                    )

                );



            }








            next();





        }


        catch(error){



            logger.error({


                message:
                    "Permission middleware failed",


                error:{
                    message:
                        error.message
                }



            });



            next(error);



        }



    };



}









module.exports =
    authorizePermission;