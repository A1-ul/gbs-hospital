"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA DATABASE HEALTH CHECK

Production Hardened
CommonJS Only

LOCATION:
src/core/database/prisma.health.js

====================================================
*/


const prisma =
    require("./prisma.client");


const logger =
    require("../utils/logger");



const HEALTH_TIMEOUT =
    Number(process.env.DB_HEALTH_TIMEOUT) || 5000;





function createTimeout(ms){


    let timer;


    const promise =
        new Promise(
            (_, reject)=>{


                timer =
                    setTimeout(()=>{


                        reject(
                            new Error(
                                "Database health check timeout"
                            )
                        );


                    }, ms);


            }
        );



    return {


        promise,


        clear(){

            clearTimeout(timer);

        }


    };


}









async function databaseHealth(){


    const start =
        Date.now();


    const timeout =
        createTimeout(
            HEALTH_TIMEOUT
        );



    try {



        await Promise.race([



            prisma.$queryRaw`
                SELECT 1
            `,


            timeout.promise



        ]);



        timeout.clear();



        return Object.freeze({


            status:
                "connected",


            database:
                "PostgreSQL",


            healthy:
                true,


            responseTime:
                `${Date.now() - start}ms`,


            timestamp:
                new Date().toISOString()


        });



    }


    catch(error){



        timeout.clear();




        logger.error({


            message:
                "Database health check failed",


            error:{
                message:
                    error.message
            }


        });





        return Object.freeze({



            status:
                "offline",



            database:
                "PostgreSQL",



            healthy:
                false,



            responseTime:
                `${Date.now() - start}ms`,



            timestamp:
                new Date().toISOString()



        });



    }



}









module.exports =
    databaseHealth;