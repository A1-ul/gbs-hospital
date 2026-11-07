"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SECURE ENCRYPTION SERVICE

PRODUCTION HARDENED

COMMONJS ONLY

LOCATION:
src/core/security/encryption.js

====================================================
*/


const crypto =
    require("crypto");


const logger =
    require("../utils/logger");





const ALGORITHM =
    "aes-256-gcm";



const IV_LENGTH =
    16;


const AUTH_TAG_LENGTH =
    16;


const KEY_LENGTH =
    32;






function getEncryptionKey(){



    const key =
        process.env.ENCRYPTION_KEY;



    if(
        !key
    ){


        throw new Error(
            "ENCRYPTION_KEY is not configured"
        );


    }



    return crypto

        .createHash("sha256")

        .update(key)

        .digest();

}





function encrypt(value){



    if(
        value === null ||
        value === undefined
    ){

        return null;

    }



    try{



        const key =
            getEncryptionKey();



        const iv =
            crypto.randomBytes(
                IV_LENGTH
            );



        const cipher =
            crypto.createCipheriv(

                ALGORITHM,

                key,

                iv

            );





        let encrypted =
            cipher.update(

                String(value),

                "utf8",

                "hex"

            );



        encrypted +=
            cipher.final("hex");





        const authTag =
            cipher.getAuthTag();






        return {


            encrypted,


            iv:
                iv.toString("hex"),


            authTag:
                authTag.toString("hex")



        };



    }

    catch(error){



        logger.error({


            message:
                "Encryption failed",


            error:{
                message:
                    error.message
            }



        });



        throw error;


    }


}









function decrypt(payload){



    if(
        !payload ||
        !payload.encrypted ||
        !payload.iv ||
        !payload.authTag
    ){


        throw new Error(
            "Invalid encrypted payload"
        );


    }





    try{



        const key =
            getEncryptionKey();





        const decipher =
            crypto.createDecipheriv(

                ALGORITHM,

                key,

                Buffer.from(

                    payload.iv,

                    "hex"

                )

            );





        decipher.setAuthTag(

            Buffer.from(

                payload.authTag,

                "hex"

            )

        );





        let decrypted =
            decipher.update(

                payload.encrypted,

                "hex",

                "utf8"

            );



        decrypted +=
            decipher.final("utf8");





        return decrypted;



    }

    catch(error){



        logger.error({


            message:
                "Decryption failed",


            error:{
                message:
                    error.message
            }


        });



        throw error;


    }


}

function hash(value){



    if(
        value === null ||
        value === undefined
    ){

        return null;

    }



    return crypto

        .createHash("sha256")

        .update(String(value))

        .digest("hex");


}









function generateRandomToken(length = 32){



    const size =
        Number(length);



    if(
        !Number.isInteger(size) ||
        size < 16 ||
        size > 256
    ){

        throw new Error(
            "Invalid token length"
        );


    }

    return crypto

        .randomBytes(size)

        .toString("hex");


}

module.exports = {


    encrypt,


    decrypt,


    hash,


    generateRandomToken


};