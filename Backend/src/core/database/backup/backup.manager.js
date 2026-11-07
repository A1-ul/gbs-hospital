"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

DATABASE BACKUP MANAGER

Production Hardened
CommonJS Only

LOCATION:
src/core/database/backup/backup.manager.js

====================================================
*/


const fs =
require("fs");

const path =
require("path");

const {execFile}
=
require("child_process");


const logger =
require("../../utils/logger");



let backupRunning =
false;



const BACKUP_PATH =
path.join(

process.cwd(),

"storage",

"backups"

);





function ensureBackupDirectory(){


    fs.mkdirSync(

        BACKUP_PATH,

        {
            recursive:true
        }

    );

}





async function createDatabaseBackup(){



    if(backupRunning){


        throw new Error(
            "Backup already running"
        );


    }




    backupRunning =
        true;



    try{


        ensureBackupDirectory();



        const filename =

        `gbs_backup_${Date.now()}.sql`;



        const filepath =
        path.join(

            BACKUP_PATH,

            filename

        );




        logger.info({

            message:
            "Database backup started",

            file:
            filename

        });





        const databaseUrl =
            process.env.DATABASE_URL;



        if(!databaseUrl){


            throw new Error(
                "DATABASE_URL missing"
            );


        }







        await new Promise(

            (resolve,reject)=>{


                execFile(

                    "pg_dump",

                    [

                        databaseUrl

                    ],

                    {

                        maxBuffer:
                        1024 * 1024 * 50

                    },


                    (
                        error,

                        stdout

                    )=>{


                        if(error){

                            return reject(error);

                        }



                        fs.writeFileSync(

                            filepath,

                            stdout

                        );



                        resolve();


                    }


                );


            }


        );





        logger.info({


            message:
            "Database backup completed",


            file:
            filepath


        });




        return filepath;



    }


    catch(error){


        logger.error({


            message:
            "Database backup failed",


            error:
            error.message


        });



        throw error;



    }


    finally{


        backupRunning =
            false;


    }


}






module.exports = {


    createDatabaseBackup


};