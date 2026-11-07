"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

CENTRAL METRICS SERVICE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/metrics.service.js

====================================================
*/


const logger =
    require("../utils/logger");







const METRICS_KEY =
    "__GBS_HOSPITAL_METRICS__";







if(
    !global[METRICS_KEY]
){

    global[METRICS_KEY] = {


        counters:{},


        gauges:{},


        timestamps:{}



    };


}






const metrics =
    global[METRICS_KEY];









function normalizeName(name){


    if(
        typeof name !== "string" ||
        !name.trim()
    ){

        return "unknown_metric";

    }


    return name

        .trim()

        .toLowerCase()

        .replace(
            /[^a-z0-9_.-]/g,
            "_"
        );


}









function increment(

    name,

    value = 1

){


    try{


        const key =
            normalizeName(name);



        metrics.counters[key] =

            (

                metrics.counters[key] || 0

            )

            +

            Number(value);



        metrics.timestamps[key] =
            new Date();




    }


    catch(error){



        logger.error({


            message:
                "Metric increment failed",


            error:{
                message:
                    error.message
            }



        });


    }


}









function setGauge(

    name,

    value

){


    try{



        const key =
            normalizeName(name);



        metrics.gauges[key] =
            Number(value);



        metrics.timestamps[key] =
            new Date();



    }

    catch(error){



        logger.error({


            message:
                "Metric gauge update failed",


            error:{
                message:
                    error.message
            }



        });



    }


}









function observe(

    name,

    value

){



    const key =
        normalizeName(name);



    if(
        !metrics.gauges[key]
    ){

        metrics.gauges[key] = [];


    }



    if(
        !Array.isArray(
            metrics.gauges[key]
        )
    ){

        metrics.gauges[key] = [];

    }





    metrics.gauges[key].push(

        Number(value)

    );






    /*
    Prevent unlimited memory growth

    */


    if(
        metrics.gauges[key].length > 1000
    ){


        metrics.gauges[key].shift();


    }




    metrics.timestamps[key] =
        new Date();



}









function getAverage(

    values

){



    if(
        !Array.isArray(values) ||
        values.length === 0
    ){

        return 0;

    }




    return Number(

        (

            values.reduce(

                (a,b)=>a+b,

                0

            )

            /

            values.length

        ).toFixed(2)

    );


}









function getMetrics(){



    const gauges = {};




    Object.keys(

        metrics.gauges

    )

    .forEach(

        key=>{


            const value =
                metrics.gauges[key];



            gauges[key] =

                Array.isArray(value)

                ?

                {

                    samples:
                        value.length,


                    average:
                        getAverage(value)


                }

                :

                value;



        }

    );







    return Object.freeze({



        counters:
            {
                ...metrics.counters
            },



        gauges,



        timestamps:
            {
                ...metrics.timestamps
            },



        generatedAt:
            new Date().toISOString()



    });


}









function resetMetrics(){



    metrics.counters = {};

    metrics.gauges = {};

    metrics.timestamps = {};




    logger.info({


        message:
            "System metrics reset"



    });



}









module.exports = {


    increment,


    setGauge,


    observe,


    getMetrics,


    resetMetrics



};