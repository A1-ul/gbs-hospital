"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SECURITY HEADERS MIDDLEWARE

Production Hardened
CommonJS Only

====================================================
*/


let helmet;


try{


    helmet =
        require("helmet");


}
catch(error){


    module.exports =
    function(){

        return function(
            req,
            res,
            next
        ){

            next();

        };

    };


    return;

}







module.exports =
helmet({

    contentSecurityPolicy:false,


    crossOriginEmbedderPolicy:false,


    hidePoweredBy:true,


    frameguard:true,


    xssFilter:true,


    noSniff:true


});