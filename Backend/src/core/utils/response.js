'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

STANDARD API RESPONSE HANDLER

Production Hardened
CommonJS Only

LOCATION:
backend/src/utils/response.js

====================================================
*/


const {
    API_VERSION
}
=
require('../config/constants');




const isProduction =
    process.env.NODE_ENV === 'production';







function deepFreeze(object){


    Object
        .values(object)
        .forEach(value=>{


            if(
                value &&
                typeof value === 'object' &&
                !Object.isFrozen(value)
            ){

                deepFreeze(value);

            }


        });


    return Object.freeze(object);

}








function buildMeta(

    requestId = null

){


    return deepFreeze({


        timestamp:
            new Date()
            .toISOString(),


        requestId,


        apiVersion:
            API_VERSION


    });


}









function normalizeStatus(status){


    const code =
        Number(status);



    if(

        !Number.isInteger(code) ||

        code < 100 ||

        code > 599

    ){

        return 500;

    }


    return code;


}









function successResponse(

    res,

    {

        data = null,

        message = 'Success',

        statusCode = 200,

        requestId = null,

        pagination = null

    } = {}

){



    return res

        .status(
            normalizeStatus(statusCode)
        )

        .json(


            deepFreeze({


                success:true,


                type:
                    'SUCCESS_RESPONSE',


                message,


                data,


                pagination,


                meta:
                    buildMeta(requestId)



            })

        );


}









function errorResponse(

    res,

    {

        message =
            'Internal Server Error',


        statusCode = 500,


        code =
            'INTERNAL_ERROR',


        requestId = null,


        details = null


    } = {}

){





    return res

        .status(

            normalizeStatus(statusCode)

        )

        .json(


            deepFreeze({


                success:false,


                type:
                    'ERROR_RESPONSE',



                error:{


                    code,


                    message,


                    details:

                    isProduction

                    ? null

                    : details


                },



                meta:
                    buildMeta(requestId)



            })


        );


}









function paginatedResponse(

    res,

    {

        data = [],

        page = 1,

        limit = 20,

        total = 0,

        message = 'Success',

        requestId = null

    } = {}

){



    const pages =
        limit > 0

        ?

        Math.ceil(
            total / limit
        )

        :

        0;





    return successResponse(

        res,

        {


            data,


            message,


            requestId,



            pagination:{


                page,


                limit,


                total,


                pages


            }


        }


    );


}









module.exports = {


    successResponse,


    errorResponse,


    paginatedResponse


};