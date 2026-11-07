"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA TRANSACTION SAFETY LAYER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.transaction.js

====================================================
*/


const prisma =
require("./prisma.client");


const logger =
require("../utils/logger");





const DEFAULT_OPTIONS =
Object.freeze({

    timeout:
        10000,


    maxWait:
        5000,


    isolationLevel:
        "ReadCommitted"

});





const MAX_RETRIES = 3;







function normalizeError(error){


    if(!error){

        return null;

    }



    return Object.freeze({

        name:
            error.name || "Error",


        message:
            error.message || String(error),


        code:
            error.code || null

    });


}









function isRetryable(error){


    const retryCodes = [

        "P2034",

        "P1008",

        "P1017"

    ];



    return Boolean(

        error &&

        retryCodes.includes(
            error.code
        )

    );


}









function wait(ms){


    return new Promise(

        resolve =>
            setTimeout(
                resolve,
                ms
            )

    );


}









function buildOptions(options){


    return {


        ...DEFAULT_OPTIONS,


        ...(options || {})


    };


}









async function transaction(

    callback,

    options = {}

){



    if(
        typeof callback !== "function"
    ){

        throw new TypeError(

            "Transaction callback must be a function"

        );

    }






    const settings =
        buildOptions(options);





    let attempt = 0;





    while(
        attempt < MAX_RETRIES
    ){


        attempt++;




        try{



            return await prisma.$transaction(


                async(tx)=>{


                    return await callback(tx);


                },


                settings


            );



        }


        catch(error){



            logger.error({


                message:
                "Database transaction failed",


                attempt,


                error:
                normalizeError(error)


            });







            if(
                !isRetryable(error) ||
                attempt >= MAX_RETRIES
            ){


                throw error;


            }





            await wait(
                attempt * 500
            );



        }



    }



}









async function interactiveTransaction(

callback,

options = {}

){



    if(
        typeof callback !== "function"
    ){

        throw new TypeError(

            "Transaction callback must be a function"

        );

    }





    try{


        return await prisma.$transaction(

            callback,


            buildOptions(options)

        );



    }


    catch(error){



        logger.error({


            message:
            "Interactive transaction failed",


            error:
            normalizeError(error)


        });



        throw error;



    }



}







module.exports =
{

    transaction,


    interactiveTransaction

};