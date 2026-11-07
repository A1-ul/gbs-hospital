"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

MAINTENANCE MODE MIDDLEWARE

Production Hardened
CommonJS Only

====================================================
*/


const AppError =
require("../errors/app.error");






module.exports =
function maintenanceMiddleware(

    req,

    res,

    next

){



    const enabled =

        process.env.MAINTENANCE_MODE === "true";




    const allowedPaths = [

        "/health",

        "/api/health"

    ];





    if(

        enabled &&

        !allowedPaths.includes(
            req.originalUrl
        )

    ){


        return next(

            new AppError(

                "System under maintenance",

                503,

                "MAINTENANCE_MODE"

            )

        );


    }





    next();


};