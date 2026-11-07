"use strict";


const AppError =
require("../errors/app.error");


module.exports =
function notFoundMiddleware(
    req,
    res,
    next
){

    next(

        new AppError(

            "API endpoint not found",

            404,

            "ROUTE_NOT_FOUND"

        )

    );

};