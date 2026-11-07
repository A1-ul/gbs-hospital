'use strict';

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA QUERY SAFETY WRAPPER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.query.js

====================================================
*/


const logger =
require("../utils/logger");



const DEFAULT_TIMEOUT = 10000;

const MAX_TIMEOUT = 60000;




function normalizeTimeout(value){


    const timeout =
    Number(value);



    if(
        !Number.isInteger(timeout) ||
        timeout < 1000 ||
        timeout > MAX_TIMEOUT
    ){

        return DEFAULT_TIMEOUT;

    }


    return timeout;

}







function createTimeout(ms){


    let timer;


    const promise =
    new Promise(
        (_, reject)=>{


            timer =
            setTimeout(()=>{


                const error =
                new Error(
                    "Database query timeout"
                );


                error.code =
                "DATABASE_TIMEOUT";


                reject(error);


            }, ms);


        }
    );



    return {


        promise,


        clear(){

            if(timer){

                clearTimeout(timer);

            }

        }


    };


}









async function safeQuery(

    operation,

    callback,

    timeout = DEFAULT_TIMEOUT

){



    if(
        typeof callback !== "function"
    ){

        throw new TypeError(
            "Database callback must be a function"
        );

    }



    const start =
    Date.now();



    const queryName =
    operation ||
    "UNKNOWN_OPERATION";




    const timeoutHandler =
    createTimeout(

        normalizeTimeout(timeout)

    );





    try{



        const result =
        await Promise.race([


            callback(),


            timeoutHandler.promise


        ]);




        logger.debug({


            message:
            "Database query completed",


            operation:
            queryName,


            duration:
            `${Date.now() - start}ms`


        });




        return result;



    }

    catch(error){



        logger.error({


            message:
            "Database query failed",


            operation:
            queryName,


            duration:
            `${Date.now() - start}ms`,


            error:{


                message:
                error.message,


                code:
                error.code || null


            }


        });



        throw error;



    }

    finally{


        timeoutHandler.clear();


    }


}







module.exports =
safeQuery;