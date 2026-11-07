"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

ROLE AUTHORIZATION MIDDLEWARE

Production Hardened
CommonJS Only

LOCATION:
src/core/security/role.middleware.js

====================================================
*/


const AppError =
    require("../errors/app.error");


const logger =
    require("../utils/logger");








function authorizeRoles(...roles){



    const allowedRoles =

        roles

            .filter(
                role =>
                    typeof role === "string"
            )

            .map(
                role =>
                    role.trim()
            )

            .filter(
                Boolean
            );






    if(
        allowedRoles.length === 0
    ){

        throw new Error(
            "At least one valid role is required"
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








            const userRole =

                typeof req.user.role === "string"

                ?

                req.user.role.trim()

                :

                null;








            if(
                !userRole
            ){



                logger.warn({


                    message:
                        "User role missing",


                    user:
                        req.user.id || null,


                    path:
                        req.originalUrl



                });



                return next(

                    new AppError(

                        "Access denied",

                        403,

                        "ACCESS_DENIED"

                    )

                );


            }








            if(
                !allowedRoles.includes(userRole)
            ){



                logger.warn({


                    message:
                        "Role authorization failed",


                    requiredRoles:
                        allowedRoles,


                    providedRole:
                        userRole,


                    user:
                        req.user.id || null,


                    path:
                        req.originalUrl



                });





                return next(

                    new AppError(

                        "Access denied",

                        403,

                        "INSUFFICIENT_PERMISSION",

                        {

                            requiredRoles:
                                allowedRoles

                        }

                    )

                );


            }







            next();





        }

        catch(error){



            logger.error({


                message:
                    "Role middleware failure",


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
    authorizeRoles;