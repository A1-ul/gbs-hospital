"use strict";


/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

PRODUCTION EXPRESS APPLICATION

COMMONJS ONLY

PHASE 1
PART 5
STEP 2

HARDENED VERSION

====================================================
*/


const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");


const logger =
require("./core/utils/logger");


const securityMiddleware =
require("./core/middleware/security.middleware");


const requestMiddleware =
require("./core/middleware/request.middleware");


const routes =
require("./routes");


const notFoundMiddleware =
require("./core/middleware/notFound.middleware");


const errorMiddleware =
require("./core/middleware/error.middleware");





/*
====================================================
CREATE EXPRESS APPLICATION
====================================================
*/

const app = express();





/*
====================================================
REQUEST ID TRACKING
====================================================

Every request receives unique identifier.

Used for:
- debugging
- audit trail
- hospital operations tracing

====================================================
*/


app.use(
(req,res,next)=>{


    try{


        const requestId =
        uuidv4();


        req.requestId =
        requestId;


        res.setHeader(
            "X-Request-ID",
            requestId
        );


    }
    catch(error){


        logger.error({

            message:
            "Request ID middleware failed",

            error

        });


    }


    next();


}

);








/*
====================================================
SECURITY MIDDLEWARE
====================================================
*/


securityMiddleware(app);








/*
====================================================
BODY PARSING
====================================================
*/


app.use(

express.json({

    limit:"2mb",

    strict:true

})

);



app.use(

express.urlencoded({

    extended:false,

    limit:"2mb"

})

);








/*
====================================================
COOKIE HANDLER
====================================================
*/


app.use(
cookieParser()
);









/*
====================================================
HTTP REQUEST LOGGING

Morgan + Winston

SAFE VERSION

====================================================
*/


morgan.token(

"request-id",

(req)=>{

    return req.requestId || "-";

}

);



app.use(

morgan(

(tokens,req,res)=>{


    return [

        tokens.method(req,res),

        tokens.url(req,res),

        tokens.status(req,res),

        `${tokens["response-time"](req,res)}ms`,

        `requestId=${tokens["request-id"](req,res)}`

    ].join(" ");


},


{

stream:{

write(message){


    try{


        logger.info(
            message.trim()
        );


    }
    catch(error){


        console.error(
            "Logging failure:",
            error.message
        );


    }


}


}


}

)

);









/*
====================================================
CUSTOM REQUEST MIDDLEWARE
====================================================
*/


requestMiddleware(app);









/*
====================================================
API ROUTES
====================================================
*/


app.use(

"/api/v1",

routes

);

/*
====================================================
PRODUCTION FRONTEND STATIC & SPA ROUTING (RENDER.COM)
====================================================
*/

const frontendDistPath = path.resolve(__dirname, "../../Frontend/dist");
const frontendIndexHtml = path.join(frontendDistPath, "index.html");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    if (fs.existsSync(frontendIndexHtml)) {
      return res.sendFile(frontendIndexHtml);
    }
    return next();
  });
}









/*
====================================================
404 HANDLER

MUST COME AFTER ROUTES

====================================================
*/


app.use(

notFoundMiddleware

);









/*
====================================================
GLOBAL ERROR HANDLER

MUST BE LAST

====================================================
*/


app.use(

errorMiddleware

);









/*
====================================================
EXPORT

====================================================
*/


module.exports =
app;