"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DISASTER RECOVERY CONTROLLER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/disaster.recovery.js

====================================================
*/


const logger =
    require("../utils/logger");





const RECOVERY_KEY =
    "__GBS_DISASTER_RECOVERY__";







if(
    !global[RECOVERY_KEY]
){


    global[RECOVERY_KEY] = {


        lastBackup:
            null,


        lastRecoveryCheck:
            null,


        recoveryAvailable:
            true


    };


}





const recovery =
    global[RECOVERY_KEY];









function updateBackupStatus(date = new Date()){


    recovery.lastBackup =
        date;



}









function disasterRecoveryStatus(){



    try{



        recovery.lastRecoveryCheck =
            new Date();






        const status = Object.freeze({


            database:
                "PostgreSQL",


            backup:
                recovery.lastBackup

                    ? "available"

                    : "pending",



            recovery:
                recovery.recoveryAvailable

                    ? "available"

                    : "unavailable",



            lastBackup:
                recovery.lastBackup
                    ? recovery.lastBackup.toISOString()
                    : null,



            lastCheck:
                recovery.lastRecoveryCheck
                    .toISOString(),



            timestamp:
                new Date().toISOString()



        });







        logger.info({


            message:
                "Disaster recovery status checked",


            status


        });







        return status;



    }


    catch(error){



        logger.error({


            message:
                "Disaster recovery status failed",


            error:{
                message:
                    error.message
            }


        });





        return Object.freeze({


            database:
                "PostgreSQL",


            backup:
                "unknown",


            recovery:
                "unavailable",


            timestamp:
                new Date().toISOString()


        });



    }



}









function setRecoveryAvailability(value){


    recovery.recoveryAvailable =
        Boolean(value);


}









module.exports = {


    disasterRecoveryStatus,


    updateBackupStatus,


    setRecoveryAvailability


};