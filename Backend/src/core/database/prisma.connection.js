'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA CONNECTION RESILIENCE LAYER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.connection.js

====================================================
*/


const logger =
    require('../utils/logger');


const prisma =
    require('./prisma.client');





function getNumber(
    value,
    fallback,
    min,
    max
){


    const number =
        Number(value);



    if(
        !Number.isInteger(number) ||
        number < min ||
        number > max
    ){

        return fallback;

    }



    return number;

}







const MAX_RETRIES =
    getNumber(
        process.env.DB_MAX_RETRIES,
        5,
        1,
        20
    );




const RETRY_DELAY =
    getNumber(
        process.env.DB_RETRY_DELAY,
        3000,
        500,
        60000
    );







let connected =
    false;



let connecting =
    null;



let disconnecting =
    false;







function wait(ms){


    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );


}








function normalizeError(error){


    return {


        message:
            error.message || 
            'Unknown database error',


        code:
            error.code || null


    };


}









async function checkDatabaseConnection(){


    try{


        await prisma.$queryRaw`
            SELECT 1
        `;


        return true;


    }

    catch(error){


        logger.error({


            message:
                'Database health check failed',


            error:
                normalizeError(error)


        });



        return false;


    }


}









async function connectWithRetry(){



    if(connected){


        return true;


    }






    if(connecting){


        return connecting;


    }







    connecting =
        (async()=>{



            let lastError;



            for(
                let attempt = 1;
                attempt <= MAX_RETRIES;
                attempt++
            ){


                try{


                    logger.info({


                        message:
                            'Database connection attempt',


                        attempt,


                        maxRetries:
                            MAX_RETRIES,


                        database:
                            'PostgreSQL'


                    });







                    await prisma.$connect();





                    connected =
                        true;





                    logger.info({


                        message:
                            'Database connection established',


                        database:
                            'PostgreSQL'


                    });





                    return true;



                }


                catch(error){


                    lastError =
                        error;



                    logger.error({


                        message:
                            'Database connection failed',


                        attempt,


                        error:
                            normalizeError(error)


                    });





                    if(
                        attempt < MAX_RETRIES
                    ){


                        await wait(
                            RETRY_DELAY
                        );


                    }



                }


            }







            const databaseError =
                new Error(
                    `Database unavailable after ${MAX_RETRIES} attempts`
                );



            databaseError.code =
                'DATABASE_CONNECTION_FAILED';



            databaseError.cause =
                lastError;



            throw databaseError;




        })();








    try{


        return await connecting;


    }

    finally{


        connecting =
            null;


    }


}









async function disconnectDatabase(){



    if(
        disconnecting
    ){

        return;


    }





    disconnecting =
        true;




    try{


        await prisma.$disconnect();



        connected =
            false;





        logger.info({


            message:
                'Database disconnected safely'


        });



    }


    catch(error){


        logger.error({


            message:
                'Database disconnect failed',


            error:
                normalizeError(error)


        });


    }


    finally{


        disconnecting =
            false;


    }


}










module.exports = {


    connectWithRetry,


    checkDatabaseConnection,


    disconnectDatabase


};