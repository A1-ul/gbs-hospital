"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

FILE UPLOAD SECURITY MIDDLEWARE

Production Hardened
CommonJS Only

====================================================
*/


let multer;


try{

    multer =
        require("multer");

}
catch(error){


    module.exports =
    function(
        req,
        res,
        next
    ){

        next();

    };


    return;

}





const path =
require("path");




const AppError =
require("../errors/app.error");





const upload =
multer({


    storage:

    multer.diskStorage({


        destination:

        function(
            req,
            file,
            cb
        ){

            cb(

                null,

                "storage/uploads"

            );

        },



        filename:

        function(
            req,
            file,
            cb
        ){

            const unique =
                Date.now()
                +
                "-"
                +
                Math.round(
                    Math.random()*100000
                );


            cb(

                null,

                unique +
                path.extname(
                    file.originalname
                )

            );

        }


    }),



    limits:{


        fileSize:
            Number(
                process.env.MAX_FILE_SIZE
            )
            ||
            5 * 1024 * 1024


    },



    fileFilter:

    function(
        req,
        file,
        cb
    ){


        const allowed = [

            "image/jpeg",

            "image/png",

            "application/pdf"

        ];



        if(
            allowed.includes(
                file.mimetype
            )
        ){

            return cb(
                null,
                true
            );

        }



        cb(

            new AppError(

                "Invalid file type",

                400,

                "INVALID_FILE_TYPE"

            )

        );


    }


});







module.exports =
upload;