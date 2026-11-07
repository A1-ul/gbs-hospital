"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA DATABASE CLIENT

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.client.js

====================================================
*/


const {
    PrismaClient
} =
require("@prisma/client");



const logger =
    require("../utils/logger");



const {
    environment
}
=
require("../../config/environment");






const GLOBAL_KEY =
    "__GBS_HOSPITAL_PRISMA__";





function createClient(){



    const prisma =
        new PrismaClient({



            log:

                environment.IS_DEVELOPMENT

                    ?

                    [
                        {
                            emit:
                                "event",
                            level:
                                "query"
                        },

                        "warn",

                        "error"
                    ]

                    :

                    [
                        "error"
                    ],




            errorFormat:
                "minimal"


        });








    /*
    ================================================
    DEVELOPMENT QUERY MONITOR
    ================================================
    */


    if(
        environment.IS_DEVELOPMENT
    ){


        prisma.$on(

            "query",

            (event)=>{


                logger.debug({


                    message:
                        "Prisma query executed",


                    duration:
                        `${event.duration}ms`


                });


            }

        );


    }








    return prisma;


}









const prisma =

    global[GLOBAL_KEY]

    ||

    createClient();







if(
    !global[GLOBAL_KEY]
){


    global[GLOBAL_KEY] =
        prisma;


}









async function connectPrisma(){


    try{


        await prisma.$connect();



        logger.info({


            message:
                "Prisma database connected"


        });



    }


    catch(error){



        logger.error({


            message:
                "Prisma connection failed",


            error:{
                message:
                    error.message
            }


        });



        throw error;


    }



}









async function disconnectPrisma(){


    try{



        await prisma.$disconnect();



        logger.info({


            message:
                "Prisma disconnected safely"


        });



    }


    catch(error){



        logger.error({


            message:
                "Prisma disconnect failed",


            error:{
                message:
                    error.message
            }


        });


    }



}









if(
    !global.__GBS_PRISMA_SHUTDOWN__
){



    global.__GBS_PRISMA_SHUTDOWN__ =
        true;





    process.once(

        "SIGINT",

        async()=>{


            await disconnectPrisma();

            process.exit(0);


        }

    );







    process.once(

        "SIGTERM",

        async()=>{


            await disconnectPrisma();

            process.exit(0);


        }

    );



}









module.exports =
    prisma;



module.exports.connectPrisma =
    connectPrisma;



module.exports.disconnectPrisma =
    disconnectPrisma;