"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE RESTORE VALIDATOR

Production Hardened
CommonJS Only

LOCATION:
src/core/database/backup/restore.validator.js

====================================================
*/


const fs =
require("fs");

const path =
require("path");


const logger =
require("../../utils/logger");







function validateBackupFile(filePath){



    try{



        if(
            !filePath ||
            typeof filePath !== "string"
        ){


            throw new Error(
                "Backup file path required"
            );


        }





        const absolutePath =
        path.resolve(filePath);





        if(
            !fs.existsSync(absolutePath)
        ){


            throw new Error(
                "Backup file does not exist"
            );


        }







        const stats =
        fs.statSync(
            absolutePath
        );





        if(
            !stats.isFile()
        ){


            throw new Error(
                "Backup path is not a file"
            );


        }






        if(
            stats.size === 0
        ){


            throw new Error(
                "Backup file is empty"
            );


        }







        if(
            path.extname(absolutePath)
            !==
            ".sql"
        ){


            throw new Error(
                "Invalid backup file format"
            );


        }








        logger.info({


            message:
            "Backup file validation passed",


            file:
            absolutePath


        });






        return true;



    }

    catch(error){



        logger.error({


            message:
            "Backup validation failed",


            error:
            error.message


        });



        throw error;



    }


}







function validateRestoreSafety(){



    if(
        process.env.NODE_ENV === "production"
        &&
        process.env.ALLOW_DATABASE_RESTORE !== "true"
    ){


        throw new Error(

            "Database restore disabled in production"

        );


    }





    return true;



}







module.exports = {


    validateBackupFile,


    validateRestoreSafety


};