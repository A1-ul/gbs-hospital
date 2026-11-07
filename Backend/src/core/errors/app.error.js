"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

APPLICATION ERROR CLASS

Production Hardened
CommonJS Only

LOCATION:
src/core/errors/app.error.js

====================================================
*/


class AppError extends Error {


    constructor(

        message,

        statusCode = 500,

        code = "INTERNAL_ERROR",

        details = null,

        options = {}

    ){

        super(

            message || "Application error"

        );



        this.name =
            "AppError";



        this.statusCode =
            AppError.normalizeStatusCode(
                statusCode
            );



        this.code =
            code ||
            "INTERNAL_ERROR";



        this.details =
            details;



        this.isOperational =
            options.isOperational !== false;



        this.timestamp =
            new Date()
            .toISOString();




        if(options.cause){

            this.cause =
                options.cause;

        }




        Error.captureStackTrace(

            this,

            this.constructor

        );



    }





    static normalizeStatusCode(code){


        const status =
            Number(code);



        if(

            Number.isInteger(status)

            &&

            status >= 400

            &&

            status <= 599

        ){

            return status;

        }



        return 500;


    }






    toJSON(){


        const production =
            process.env.NODE_ENV === "production";



        return Object.freeze({


            name:
                this.name,


            message:
                this.message,


            code:
                this.code,


            statusCode:
                this.statusCode,


            details:
                production
                    ? null
                    : this.details,


            timestamp:
                this.timestamp


        });


    }



}




module.exports =
    AppError;