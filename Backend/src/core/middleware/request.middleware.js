"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

REQUEST TRACKING MIDDLEWARE

Production Hardened
CommonJS Only

LOCATION:
src/core/middleware/request.middleware.js

====================================================
*/


const logger =
    require("../utils/logger");



let uuidGenerator;



try {


    const uuid =
        require("uuid");


    uuidGenerator =
        uuid.v4;


}
catch(error){


    uuidGenerator =
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
function requestMiddleware(app){



    if(
        !app ||
        typeof app.use !== "function"
    ){


        throw new Error(

            "Express application instance required"

        );


    }







    app.use(

        function(

            req,

            res,

            next

        ){



            const start =
                Date.now();





            try{


                req.requestId =
                    uuidGenerator();





                req.requestTime =
                    new Date()
                    .toISOString();





                res.setHeader(

                    "X-Request-ID",

                    req.requestId

                );





                res.on(

                    "finish",

                    function(){



                        const duration =

                            Date.now()
                            -
                            start;





                        logger.info({


                            message:
                                "HTTP Request Completed",


                            requestId:
                                req.requestId,


                            method:
                                req.method,


                            url:
                                req.originalUrl,


                            statusCode:
                                res.statusCode,


                            duration:
                                `${duration}ms`



                        });



                    }


                );





                next();



            }

            catch(error){



                logger.error({


                    message:
                        "Request middleware failure",


                    error:{
                        message:
                            error.message
                    }


                });




                next(error);



            }



        }


    );



};