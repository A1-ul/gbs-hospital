"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

CACHE SERVICE

Production Hardened
CommonJS Only

LOCATION:
src/cache/cache.service.js

====================================================
*/


const logger =
    require("../core/utils/logger");


const {
    redisClient
}
=
require("./redis.client");







async function setCache(

    key,

    value,

    ttl = 3600

){


    if(!redisClient){

        return false;

    }



    try{


        await redisClient.set(

            key,

            JSON.stringify(value),

            "EX",

            ttl

        );


        return true;


    }

    catch(error){


        logger.error({

            message:
                "Cache write failed",

            key,

            error:{
                message:
                    error.message
            }

        });


        return false;


    }


}








async function getCache(key){


    if(!redisClient){

        return null;

    }



    try{


        const data =
            await redisClient.get(key);



        if(!data){

            return null;

        }




        return JSON.parse(data);



    }

    catch(error){


        logger.error({

            message:
                "Cache read failed",

            key,

            error:{
                message:
                    error.message
            }

        });


        return null;


    }


}









async function deleteCache(key){


    if(!redisClient){

        return false;

    }



    try{


        await redisClient.del(key);


        return true;


    }

    catch(error){


        logger.error({

            message:
                "Cache delete failed",

            key,

            error:{
                message:
                    error.message
            }

        });


        return false;


    }


}








async function clearCache(){


    if(!redisClient){

        return false;

    }



    try{


        await redisClient.flushdb();


        return true;


    }

    catch(error){


        logger.error({

            message:
                "Cache clear failed",

            error:{
                message:
                    error.message
            }

        });


        return false;


    }


}






module.exports = {


    setCache,


    getCache,


    deleteCache,


    clearCache


};