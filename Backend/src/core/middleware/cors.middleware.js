"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

CORS SECURITY MIDDLEWARE

Production Hardened
CommonJS Only
====================================================
*/


let cors;


try{


    cors =
        require("cors");


}
catch(error){


    cors =
    function(){

        return function(
            req,
            res,
            next
        ){

            next();

        };

    };


}






const allowedOrigins =

process.env.CORS_ORIGIN

?

process.env.CORS_ORIGIN
.split(",")

.map(
origin=>origin.trim()
)

:

[
    "http://localhost:3000"
];






module.exports =
function corsMiddleware(){


    return cors({


        origin:function(
            origin,
            callback
        ){



            if(!origin){

                return callback(
                    null,
                    true
                );

            }



            if(
                allowedOrigins.includes(origin)
            ){

                return callback(
                    null,
                    true
                );

            }



            return callback(

                new Error(
                    "CORS origin denied"
                )

            );


        },


        credentials:true,


        methods:[

            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"

        ],


        allowedHeaders:[

            "Content-Type",

            "Authorization",

            "X-Request-ID"

        ]



    });


};