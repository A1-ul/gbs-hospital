"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

PASSWORD SECURITY SERVICE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/security/password.js

====================================================
*/


const bcrypt =
    require("bcrypt");


const logger =
    require("../utils/logger");





const DEFAULT_SALT_ROUNDS =
    12;






function getSaltRounds(){



    const rounds =
        Number(
            process.env.BCRYPT_ROUNDS
        );



    if(
        !Number.isInteger(rounds) ||
        rounds < 10 ||
        rounds > 15
    ){

        return DEFAULT_SALT_ROUNDS;

    }



    return rounds;


}









function validatePassword(password){



    if(
        typeof password !== "string"
    ){


        throw new Error(
            "Password must be a string"
        );


    }





    if(
        password.length < 8
    ){


        throw new Error(
            "Password must contain at least 8 characters"
        );


    }





    if(
        password.length > 128
    ){


        throw new Error(
            "Password exceeds maximum length"
        );


    }


}









async function hashPassword(password){



    validatePassword(password);



    try{



        return await bcrypt.hash(

            password,

            getSaltRounds()

        );



    }


    catch(error){



        logger.error({


            message:
                "Password hashing failed",


            error:{
                message:
                    error.message
            }



        });



        throw error;


    }



}









async function comparePassword(

    password,

    hash

){



    if(
        typeof password !== "string" ||
        typeof hash !== "string"
    ){


        return false;


    }







    try{



        return await bcrypt.compare(

            password,

            hash

        );



    }


    catch(error){



        logger.warn({


            message:
                "Password comparison failed",


            error:{
                message:
                    error.message
            }



        });



        return false;


    }



}









function passwordStrength(password){



    if(
        typeof password !== "string"
    ){

        return false;

    }




    return (

        password.length >= 8 &&

        /[A-Z]/.test(password) &&

        /[a-z]/.test(password) &&

        /[0-9]/.test(password) &&

        /[^A-Za-z0-9]/.test(password)

    );


}









module.exports = {


    hashPassword,


    comparePassword,


    passwordStrength


};