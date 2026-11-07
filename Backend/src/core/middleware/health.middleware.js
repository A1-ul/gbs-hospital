"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

HEALTH CHECK MIDDLEWARE

Production Hardened
CommonJS Only

====================================================
*/


const prisma =
require("../database/prisma.client");





module.exports =
async function healthMiddleware(

    req,

    res,

    next

){


    try{


        await prisma.$queryRaw`

            SELECT 1

        `;



        res.status(200).json({


            success:true,


            status:"healthy",


            database:"connected",


            timestamp:

            new Date()
            .toISOString()


        });


    }


    catch(error){


        res.status(503).json({


            success:false,


            status:"unhealthy",


            database:"offline",


            timestamp:

            new Date()
            .toISOString()


        });


    }


};