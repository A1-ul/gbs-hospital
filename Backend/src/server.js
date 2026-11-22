"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PRODUCTION SERVER BOOTSTRAP

COMMONJS ONLY

PHASE 1
PART 6

SERVER CORE HARDENED

====================================================
*/


const http = require("http");


const app =
    require("./app");



const {
    connectDatabase,
    disconnectDatabase
}
    =
    require("./config/database");



const {
    environment,
    validateEnvironment
}
    =
    require("./config/environment");



const logger =
    require("./core/utils/logger");



const {
    startSystemMonitor
}
    =
    require("./core/monitoring/system.monitor");



const {
    validateMigrationSafety
}
    =
    require("./core/database/prisma.migration");

const {
    runTrialExpirationSweep
}
    =
    require("./modules/developer-control-center/developer-ops.service");





let server = null;

let started = false;

let shuttingDown = false;

let trialSweepInterval = null;
let trialSweepStartupTimer = null;







/*
====================================================
ERROR NORMALIZER
====================================================
*/


function normalizeError(error) {


    if (!error)
        return null;



    return {

        name:
            error.name || "Error",


        message:
            error.message || String(error),


        stack:
            error.stack || null

    };


}









/*
====================================================
STARTUP DISPLAY
====================================================
*/


function printStartupBanner() {


    console.log(`


==================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BACKEND STARTUP
==================================================

Environment        : ${environment.NODE_ENV}

Server Host        : ${environment.HOST || "0.0.0.0"}

Server Port        : ${environment.PORT}


Database           : PostgreSQL


Security           : Enabled


Request Tracking   : Enabled


Logging            : Enabled


API Version        : v1


==================================================
SERVER READY
==================================================

`);




    logger.info({

        message:
            "GBS Hospital Backend Started",


        status:
            "READY",


        environment:
            environment.NODE_ENV,


        host:
            environment.HOST || "0.0.0.0",


        port:
            environment.PORT


    });



}









/*
====================================================
START SERVER
====================================================
*/


async function start() {



    if (started) {

        return;

    }



    try {



        logger.info(
            "Starting GBS Hospital Backend..."
        );




        /*
        --------------------------------
        ENVIRONMENT
        --------------------------------
        */


        validateEnvironment();





        /*
        --------------------------------
        PRISMA SAFETY
        --------------------------------
        */

        try {
            await validateMigrationSafety();
        } catch (migrationErr) {
            logger.warn({
                message: "Migration safety check warning (continuing server startup)",
                error: normalizeError(migrationErr)
            });
        }



        /*
        --------------------------------
        DATABASE
        --------------------------------
        */

        try {
            await connectDatabase();
        } catch (dbErr) {
            logger.warn({
                message: "Initial database connection deferred (server will continue listening and reconnect on demand)",
                error: normalizeError(dbErr)
            });
        }








        /*
        --------------------------------
        CREATE HTTP SERVER
        --------------------------------
        */


        server =
            http.createServer(app);







        /*
        --------------------------------
        SERVER TIMEOUT HARDENING
        --------------------------------
        */


        server.keepAliveTimeout =
            65000;


        server.headersTimeout =
            66000;


        server.requestTimeout =
            120000;







        /*
        --------------------------------
        SERVER ERROR EVENTS
        --------------------------------
        */


        server.on(

            "error",

            (error) => {


                logger.error({

                    message:
                        "HTTP Server Error",


                    error:
                        normalizeError(error)


                });



                if (error.code === "EADDRINUSE") {


                    logger.error(
                        "Port already in use"
                    );


                    shutdown(
                        "PORT_ERROR"
                    );


                }



            }

        );









        /*
        --------------------------------
        START LISTENING
        --------------------------------
        */


        server.listen(


            environment.PORT,


            environment.HOST || "0.0.0.0",



            () => {


                started = true;





                try {


                    startSystemMonitor();



                    logger.info(
                        "System monitoring enabled"
                    );



                }

                catch (error) {


                    logger.error({

                        message:
                            "Monitoring startup failed",

                        error:
                            normalizeError(error)


                    });


                }






                printStartupBanner();

                if (environment.NODE_ENV !== "test") {
                    const executeScheduledSweep = async () => {
                        try {
                            const sweepResult = await runTrialExpirationSweep({ id: null, role: "SYSTEM_SCHEDULER" });
                            if (sweepResult.autoLockedCount > 0 || sweepResult.warningsIssuedCount > 0) {
                                logger.info({
                                    message: "Automated subscription trial sweep completed",
                                    evaluated: sweepResult.totalTenantsEvaluated,
                                    warningsIssued: sweepResult.warningsIssuedCount,
                                    autoLocked: sweepResult.autoLockedCount
                                });
                            }
                        } catch (sweepErr) {
                            logger.warn({
                                message: "Scheduled trial expiration sweep skipped",
                                error: normalizeError(sweepErr)
                            });
                        }
                    };

                    trialSweepStartupTimer = setTimeout(executeScheduledSweep, 30000);
                    if (typeof trialSweepStartupTimer.unref === "function") {
                        trialSweepStartupTimer.unref();
                    }

                    trialSweepInterval = setInterval(executeScheduledSweep, 6 * 60 * 60 * 1000);
                    if (typeof trialSweepInterval.unref === "function") {
                        trialSweepInterval.unref();
                    }
                }




            }

        );







    }

    catch (error) {



        logger.error({

            message:
                "Fatal startup failure",

            error:
                normalizeError(error)


        });



        process.exit(1);



    }



}









/*
====================================================
GRACEFUL SHUTDOWN
====================================================
*/


async function shutdown(signal) {



    if (shuttingDown) {

        return;

    }



    shuttingDown = true;




    logger.info({

        message:
            "Shutdown initiated",

        signal


    });





    try {

        if (trialSweepStartupTimer) {
            clearTimeout(trialSweepStartupTimer);
            trialSweepStartupTimer = null;
        }
        if (trialSweepInterval) {
            clearInterval(trialSweepInterval);
            trialSweepInterval = null;
        }



        if (server) {



            await new Promise((resolve) => {


                server.close(() => {


                    logger.info(
                        "HTTP server closed"
                    );


                    resolve();


                });


            });


        }






        if (disconnectDatabase) {


            await disconnectDatabase();


        }







        logger.info({

            message:
                "Shutdown completed"

        });




        process.exit(0);



    }

    catch (error) {



        logger.error({

            message:
                "Shutdown failure",

            error:
                normalizeError(error)

        });


        process.exit(1);


    }



}









/*
====================================================
PROCESS PROTECTION
====================================================
*/


process.on(

    "uncaughtException",

    (error) => {


        logger.error({

            message:
                "Uncaught Exception",

            error:
                normalizeError(error)

        });


        shutdown(
            "uncaughtException"
        );


    }

);







process.on(

    "unhandledRejection",

    (error) => {


        logger.error({

            message:
                "Unhandled Promise Rejection",

            error:
                normalizeError(error)

        });


        shutdown(
            "unhandledRejection"
        );


    }

);







process.on(

    "SIGINT",

    () => shutdown("SIGINT")

);





process.on(

    "SIGTERM",

    () => shutdown("SIGTERM")

);







/*
====================================================
BOOT
====================================================
*/


start();