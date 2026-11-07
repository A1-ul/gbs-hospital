"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

COMPRESSION MIDDLEWARE

Production Hardened
CommonJS Only
====================================================
*/


let compression;


try{

    compression =
        require("compression");

}
catch(error){


    compression =
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



module.exports =
function compressionMiddleware(){


    return compression({

        level:6,

        threshold:"1kb"

    });


};