"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

CRYPTOGRAPHY UTILITY SERVICE

Production Hardened
CommonJS Only

LOCATION:
src/core/utils/crypto.js

====================================================
*/


const crypto =
    require("crypto");


const logger =
    require("./logger");






const DEFAULT_ALGORITHM =
    "aes-256-gcm";



const KEY_LENGTH =
    32;



const IV_LENGTH =
    16;








function getEncryptionKey(){



    const key =
        process.env.ENCRYPTION_KEY;





    if(
        !key
    ){

        throw new Error(
            "ENCRYPTION_KEY environment variable missing"
        );

    }






    const buffer =
        Buffer.from(
            key,
            "hex"
        );






    if(
        buffer.length !== KEY_LENGTH
    ){

        throw new Error(
            "ENCRYPTION_KEY must be 32 bytes hexadecimal"
        );

    }





    return buffer;



}









function encrypt(text){



    if(
        typeof text !== "string"
    ){

        throw new TypeError(
            "Encryption input must be a string"
        );

    }






    const iv =
        crypto.randomBytes(
            IV_LENGTH
        );



    const cipher =
        crypto.createCipheriv(

            DEFAULT_ALGORITHM,

            getEncryptionKey(),

            iv

        );






    const encrypted =
        Buffer.concat([

            cipher.update(
                text,
                "utf8"
            ),

            cipher.final()

        ]);







    const authTag =
        cipher.getAuthTag();







    return {


        encrypted:

            encrypted.toString(
                "hex"
            ),


        iv:

            iv.toString(
                "hex"
            ),


        authTag:

            authTag.toString(
                "hex"
            )



    };



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



        const decipher =
            crypto.createDecipheriv(

                DEFAULT_ALGORITHM,

                getEncryptionKey(),

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






        const decrypted =
            Buffer.concat([


                decipher.update(

                    Buffer.from(

                        payload.encrypted,

                        "hex"

                    )

                ),



                decipher.final()


            ]);






        return decrypted.toString(
            "utf8"
        );



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



        throw new Error(
            "Unable to decrypt data"
        );



    }



}









function hash(value){



    if(
        typeof value !== "string"
    ){

        throw new TypeError(
            "Hash input must be string"
        );

    }





    return crypto

        .createHash("sha256")

        .update(value)

        .digest("hex");



}








function generateRandomToken(size=32){



    const length =
        Number(size);




    if(
        !Number.isInteger(length) ||
        length < 16 ||
        length > 256
    ){

        throw new Error(
            "Invalid token size"
        );

    }






    return crypto

        .randomBytes(length)

        .toString("hex");



}








module.exports = {


    encrypt,


    decrypt,


    hash,


    generateRandomToken


};