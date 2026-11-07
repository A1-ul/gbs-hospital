'use strict';

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRISMA QUERY PERFORMANCE MONITOR

Production Hardened
CommonJS Only

LOCATION:
backend/src/core/database/prisma.monitor.js

====================================================
*/


const logger =
    require('../utils/logger');





function getNumber(
    value,
    fallback
) {


    const number =
        Number(value);



    if (
        !Number.isInteger(number) ||
        number < 100
    ) {

        return fallback;

    }


    return number;

}






const SLOW_QUERY_LIMIT =
    getNumber(
        process.env.SLOW_QUERY_LIMIT,
        500
    );






const MONITOR_KEY =
    '__GBS_PRISMA_QUERY_MONITOR__';





if (!global[MONITOR_KEY]) {


    global[MONITOR_KEY] = {


        enabled:
            false,


        totalQueries:
            0,


        slowQueries:
            0,


        lastSlowQuery:
            null


    };


}






const metrics =
    global[MONITOR_KEY];








function sanitizeQuery(query) {


    if (
        !query ||
        typeof query !== 'string'
    ) {


        return 'UNKNOWN_QUERY';


    }



    if (
        process.env.NODE_ENV === 'production'
    ) {


        return 'QUERY_HIDDEN';


    }




    return query

        .replace(
            /\s+/g,
            ' '
        )

        .replace(
            /password\s*=\s*[^ ]+/gi,
            'password=?'
        )

        .replace(
            /token\s*=\s*[^ ]+/gi,
            'token=?'
        )

        .trim();


}









function startPrismaMonitor(prisma) {


    if (!prisma) {


        logger.warn({

            message:
                'Prisma monitor skipped. Client missing.'

        });


        return false;


    }






    if (
        metrics.enabled
    ) {


        return true;


    }






    try {


        prisma.$on(

            'query',

            (event)=>{


                const duration =
                    Number(
                        event.duration || 0
                    );



                metrics.totalQueries++;







                if (
                    duration >= SLOW_QUERY_LIMIT
                ) {



                    metrics.slowQueries++;


                    metrics.lastSlowQuery =
                        new Date();




                    logger.warn({


                        message:
                            'Slow database query detected',


                        duration:
                            `${duration}ms`,


                        threshold:
                            `${SLOW_QUERY_LIMIT}ms`,


                        query:
                            sanitizeQuery(
                                event.query
                            )

                    });


                }








                if (
                    process.env.NODE_ENV === 'development'
                ) {


                    logger.debug({


                        message:
                            'Database query executed',


                        duration:
                            `${duration}ms`


                    });


                }


            }


        );

        metrics.enabled =
            true;





        logger.info({

            message:
                'Prisma query monitoring enabled',


            slowQueryLimit:
                `${SLOW_QUERY_LIMIT}ms`

        });





        return true;


    }

    catch(error) {


        logger.error({

            message:
                'Failed to start Prisma query monitor',

            error:{
                message:
                    error.message
            }

        });


        return false;


    }


}

function getMonitorStatus() {


    return Object.freeze({


        enabled:
            metrics.enabled,


        totalQueries:
            metrics.totalQueries,


        slowQueries:
            metrics.slowQueries,


        lastSlowQuery:
            metrics.lastSlowQuery,


        slowQueryLimit:
            SLOW_QUERY_LIMIT


    });


}

module.exports = {


    startPrismaMonitor,


    getMonitorStatus


};