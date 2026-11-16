"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SECURITY MIDDLEWARE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/middleware/security.middleware.js

====================================================
*/


let helmet;
let cors;
let rateLimit;
let compression;


try {


    helmet =
        require("helmet");


    cors =
        require("cors");


    rateLimit =
        require("express-rate-limit");


    compression =
        require("compression");


}
catch (error) {


    console.error(
        "Security dependency loading failed:",
        error.message
    );


    process.exit(1);


}





const {
    environment
}
    =
    require("../../config/environment");



const logger =
    require("../utils/logger");









/*
====================================================
NORMALIZE CORS ORIGINS
====================================================
*/


function getAllowedOrigins() {


    if (
        !environment.CORS_ORIGIN
    ) {


        return [

            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5000",
            "http://localhost:5173",
            "https://gbs-hospital-system.onrender.com",
            "https://gbs-hospital.onrender.com"

        ];


    }



    return environment.CORS_ORIGIN

        .split(",")

        .map(
            origin =>
                origin.trim()
        )

        .filter(Boolean);


}








/*
====================================================
SECURITY HEADERS
====================================================
*/


function applyHelmet(app) {



    app.use(

        helmet({

            frameguard: {

                action:
                    "deny"

            },


            hidePoweredBy: true,


            noSniff: true,



            contentSecurityPolicy:

                environment.IS_PRODUCTION

                    ? {

                        directives: {


                            defaultSrc: [
                                "'self'"
                            ],

                            scriptSrc: [
                                "'self'",
                                "'unsafe-inline'"
                            ],

                            styleSrc: [
                                "'self'",
                                "'unsafe-inline'",
                                "https://fonts.googleapis.com"
                            ],

                            fontSrc: [
                                "'self'",
                                "https://fonts.gstatic.com",
                                "data:"
                            ],

                            imgSrc: [
                                "'self'",
                                "data:",
                                "blob:",
                                "https:"
                            ],

                            connectSrc: [
                                "'self'",
                                "https:",
                                "wss:",
                                "ws:"
                            ],

                            frameSrc: [
                                "'self'",
                                "https://www.openstreetmap.org",
                                "https://maps.google.com",
                                "https://www.google.com"
                            ],


                            objectSrc: [
                                "'none'"
                            ],


                            frameAncestors: [
                            "'self'"
                            ]

                        }


                    }

                    : false,

            crossOriginEmbedderPolicy: false,

            crossOriginResourcePolicy: {


                policy:
                    "cross-origin"


            },




            hsts:

                environment.IS_PRODUCTION

                    ? {


                        maxAge:
                            31536000,


                        includeSubDomains:
                            true,


                        preload:
                            true


                    }


                    :

                    false



        })

    );



}









/*
====================================================
COMPRESSION
====================================================
*/


function applyCompression(app) {


    app.use(

        compression({

            threshold:
                1024,


            level:
                6


        })

    );


}









/*
====================================================
CORS CONFIGURATION
====================================================
*/


function applyCors(app) {



    const allowedOrigins =
        getAllowedOrigins();





    app.use(

        cors({



            origin: function (

                origin,

                callback

            ) {





                /*
                Allow internal services
                */

                if (
                    !origin
                ) {

                    return callback(
                        null,
                        true
                    );


                }





                const isPrivateLanOrigin =
                    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);

                if (

                    allowedOrigins.includes(
                        origin
                    ) ||
                    origin.endsWith(".onrender.com") ||
                    origin.endsWith(".lhr.life") ||
                    origin.endsWith(".loca.lt") ||
                    origin.endsWith(".trycloudflare.com") ||
                    origin.startsWith("http://localhost:") ||
                    origin.startsWith("http://127.0.0.1:") ||
                    isPrivateLanOrigin

                ) {

                    return callback(
                        null,
                        true
                    );


                }






                logger.warn({


                    message:
                        "Blocked CORS request",


                    origin


                });





                return callback(

                    new Error(
                        "CORS policy violation"
                    )

                );



            },




            credentials: true,




            methods: [

                "GET",

                "POST",

                "PUT",

                "PATCH",

                "DELETE",

                "OPTIONS"

            ],




            allowedHeaders: [

                "Content-Type",

                "Authorization",

                "X-Request-ID"

            ],





            exposedHeaders: [

                "X-Request-ID"

            ]



        })

    );



}









/*
====================================================
RATE LIMITING
====================================================
*/


function applyRateLimit(app) {



    if (

        environment.IS_PRODUCTION

    ) {

        app.set(

            "trust proxy",

            1

        );

    }







    const limiter =

        rateLimit({



            windowMs:

                15 *

                60 *

                1000,





            max:


                environment.IS_PRODUCTION

                    ? 500

                    : 1000,






            standardHeaders: true,



            legacyHeaders: false,






            skip: function (req) {



                return (

                    req.path === "/health"

                );


            },







            handler: function (

                req,

                res

            ) {



                res.status(429)

                    .json({



                        success: false,


                        error: {


                            code:
                                "RATE_LIMIT_EXCEEDED",



                            message:
                                "Too many requests. Try again later."

                        }



                    });



            }





        });





    app.use(

        limiter

    );



}









/*
====================================================
SECURITY RESPONSE HEADERS
====================================================
*/


function applyCustomHeaders(app) {



    app.use(

        function (

            req,

            res,

            next

        ) {





            res.removeHeader(

                "X-Powered-By"

            );







            res.setHeader(

                "X-Content-Type-Options",

                "nosniff"

            );






            res.setHeader(

                "X-Frame-Options",

                "DENY"

            );






            res.setHeader(

                "Referrer-Policy",

                "strict-origin-when-cross-origin"

            );







            res.setHeader(

                "Permissions-Policy",

                "camera=(), microphone=(), geolocation=()"

            );





            next();



        }

    );



}









/*
====================================================
MAIN SECURITY INITIALIZER
====================================================
*/


function securityMiddleware(app) {



    if (

        !app ||

        typeof app.use !== "function"

    ) {


        throw new Error(

            "Express application instance required"

        );


    }






    applyHelmet(app);



    applyCompression(app);



    applyCors(app);



    applyRateLimit(app);



    applyCustomHeaders(app);







    logger.info({



        message:

            "Security middleware initialized",



        environment:

            environment.NODE_ENV



    });



}







module.exports =
    securityMiddleware;