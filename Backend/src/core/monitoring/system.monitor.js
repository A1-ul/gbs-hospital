"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SYSTEM RESOURCE MONITOR

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/monitoring/system.monitor.js

====================================================
*/


const logger =
    require("../utils/logger");


const metrics =
    require("./metrics.service");







const MONITOR_KEY =
    "__GBS_SYSTEM_MONITOR__";







if(
    !global[MONITOR_KEY]
){

    global[MONITOR_KEY] = {


        interval:
            null,


        started:
            false



    };


}






const monitor =
    global[MONITOR_KEY];









const DEFAULT_INTERVAL =

    Number(

        process.env.SYSTEM_MONITOR_INTERVAL

    )

    ||

    300000;









function getMemory(){



    const memory =
        process.memoryUsage();




    return {


        rss:

            Math.round(

                memory.rss /

                1024 /

                1024

            )

            +

            " MB",




        heapUsed:

            Math.round(

                memory.heapUsed /

                1024 /

                1024

            )

            +

            " MB",




        heapTotal:

            Math.round(

                memory.heapTotal /

                1024 /

                1024

            )

            +

            " MB"



    };


}









function getCpuUsage(){



    const usage =
        process.cpuUsage();



    return {


        user:

            Math.round(

                usage.user /

                1000

            )

            +

            " ms",



        system:

            Math.round(

                usage.system /

                1000

            )

            +

            " ms"



    };


}









function collectSystemMetrics(){



    try{



        const memory =
            getMemory();



        const cpu =
            getCpuUsage();







        const uptime =
            Number(

                process.uptime()

                .toFixed(2)

            );






        metrics.setGauge(

            "system.uptime",

            uptime

        );





        logger.info({


            type:
                "SYSTEM_MONITOR",



            memory,


            cpu,



            uptime,



            timestamp:
                new Date()
                    .toISOString()



        });






    }

    catch(error){



        logger.error({


            message:
                "System monitor collection failed",


            error:{
                message:
                    error.message
            }



        });



    }


}









function startSystemMonitor(){



    if(
        monitor.started
    ){


        return true;


    }






    monitor.interval =

        setInterval(

            collectSystemMetrics,

            DEFAULT_INTERVAL

        );






    /*
    Prevent node from hanging during shutdown
    */


    monitor.interval.unref?.();






    monitor.started =
        true;

    logger.info({


        message:
            "System monitoring enabled",


        interval:
            `${DEFAULT_INTERVAL}ms`



    });

    return true;
}

function stopSystemMonitor(){



    if(
        monitor.interval
    ){



        clearInterval(

            monitor.interval

        );


    }




    monitor.interval =
        null;



    monitor.started =
        false;





    logger.info({


        message:
            "System monitoring stopped"



    });



}

function getSystemMonitorStatus(){



    return Object.freeze({


        running:
            monitor.started,


        interval:
            DEFAULT_INTERVAL



    });


}


module.exports = {


    startSystemMonitor,


    stopSystemMonitor,


    collectSystemMetrics,


    getSystemMonitorStatus



};