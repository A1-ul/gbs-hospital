"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

REDIS CLIENT

Production Hardened
CommonJS Only

LOCATION:
src/cache/redis.client.js

====================================================
*/


const logger =
    require("../core/utils/logger");


let redisClient = null;


let redisEnabled = false;





function createRedisClient(){


    try{


        const Redis =
            require("ioredis");



        if(
            !process.env.REDIS_URL
        ){

            logger.warn({

                message:
                    "Redis disabled. REDIS_URL missing"

            });


            return null;

        }





        const client =
            new Redis(
                process.env.REDIS_URL,
                {

                    maxRetriesPerRequest:
                        3,


                    enableReadyCheck:
                        true,


                    lazyConnect:
                        true


                }
            );






        client.on(
            "connect",
            ()=>{


                redisEnabled = true;


                logger.info({

                    message:
                        "Redis connected"

                });


            }
        );





        client.on(
            "error",
            (error)=>{


                redisEnabled = false;


                logger.error({

                    message:
                        "Redis connection error",

                    error:{
                        message:
                            error.message
                    }

                });


            }
        );






        return client;



    }

    catch(error){



        logger.error({

            message:
                "Redis initialization failed",

            error:{
                message:
                    error.message
            }

        });


        return null;


    }


}






if(!redisClient){


    redisClient =
        createRedisClient();


}








async function connectRedis(){


    if(!redisClient){

        return false;

    }


    try{


        await redisClient.connect();


        return true;


    }

    catch(error){


        logger.error({

            message:
                "Redis connection failed",

            error:{
                message:
                    error.message
            }

        });


        return false;


    }


}






async function disconnectRedis(){


    if(!redisClient){

        return;

    }



    try{


        await redisClient.quit();


        logger.info({

            message:
                "Redis disconnected"

        });


    }

    catch(error){


        logger.error({

            message:
                "Redis disconnect failed",

            error:{
                message:
                    error.message
            }

        });


    }


}







function getRedisStatus(){


    return Object.freeze({


        enabled:
            redisEnabled,


        available:
            Boolean(redisClient)


    });


}





module.exports = {


    redisClient,


    connectRedis,


    disconnectRedis,


    getRedisStatus


};