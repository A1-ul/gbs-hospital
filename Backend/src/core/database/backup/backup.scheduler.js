"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE BACKUP SCHEDULER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/backup/backup.scheduler.js

====================================================
*/


const logger =
require("../../utils/logger");


const {
createDatabaseBackup
}
=
require("./backup.manager");




let scheduler = null;





function startBackupScheduler(){


    if(scheduler){


        logger.warn({

            message:
            "Backup scheduler already running"

        });


        return false;


    }





    const intervalMinutes =
    Number(

        process.env.BACKUP_INTERVAL_MINUTES || 1440

    );




    const interval =

    Math.max(

        intervalMinutes,

        10

    )

    *

    60

    *

    1000;







    scheduler =

    setInterval(

        async()=>{


            try{


                logger.info({

                    message:
                    "Scheduled database backup started"

                });



                await createDatabaseBackup();



                logger.info({

                    message:
                    "Scheduled database backup completed"

                });



            }

            catch(error){


                logger.error({

                    message:
                    "Scheduled database backup failed",


                    error:
                    error.message


                });


            }



        },

        interval


    );






    logger.info({

        message:
        "Database backup scheduler enabled",


        intervalMinutes

    });



    return true;


}







function stopBackupScheduler(){



    if(!scheduler){


        return false;


    }



    clearInterval(
        scheduler
    );



    scheduler = null;




    logger.info({

        message:
        "Database backup scheduler stopped"

    });



    return true;



}






function getBackupSchedulerStatus(){


    return Object.freeze({


        running:
            Boolean(scheduler)


    });


}






module.exports = {


    startBackupScheduler,


    stopBackupScheduler,


    getBackupSchedulerStatus


};