"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

CENTRAL ERROR CODES

Production Hardened
CommonJS Only

LOCATION:
src/core/errors/error.codes.js

====================================================
*/


module.exports =
Object.freeze({



    /*
    GENERAL
    */

    GENERAL_ERROR:
        "GENERAL_ERROR",


    INTERNAL_ERROR:
        "INTERNAL_ERROR",


    SERVER_ERROR:
        "SERVER_ERROR",




    /*
    VALIDATION
    */

    VALIDATION_FAILED:
        "VALIDATION_FAILED",


    INVALID_INPUT:
        "INVALID_INPUT",


    REQUIRED_FIELD_MISSING:
        "REQUIRED_FIELD_MISSING",





    /*
    AUTHENTICATION
    */

    AUTH_FAILED:
        "AUTH_FAILED",


    AUTH_REQUIRED:
        "AUTH_REQUIRED",


    TOKEN_EXPIRED:
        "TOKEN_EXPIRED",


    TOKEN_INVALID:
        "TOKEN_INVALID",


    SESSION_EXPIRED:
        "SESSION_EXPIRED",





    /*
    AUTHORIZATION
    */

    ACCESS_DENIED:
        "ACCESS_DENIED",


    INSUFFICIENT_PERMISSION:
        "INSUFFICIENT_PERMISSION",




    /*
    RESOURCE
    */

    RESOURCE_NOT_FOUND:
        "RESOURCE_NOT_FOUND",


    ROUTE_NOT_FOUND:
        "ROUTE_NOT_FOUND",


    DUPLICATE_RESOURCE:
        "DUPLICATE_RESOURCE",


    RESOURCE_CONFLICT:
        "RESOURCE_CONFLICT",




    /*
    DATABASE
    */

    DATABASE_ERROR:
        "DATABASE_ERROR",


    DATABASE_UNAVAILABLE:
        "DATABASE_UNAVAILABLE",


    DATABASE_TIMEOUT:
        "DATABASE_TIMEOUT",


    TRANSACTION_FAILED:
        "TRANSACTION_FAILED",




    /*
    SECURITY
    */

    RATE_LIMIT_EXCEEDED:
        "RATE_LIMIT_EXCEEDED",


    ACCOUNT_LOCKED:
        "ACCOUNT_LOCKED",


    SECURITY_VIOLATION:
        "SECURITY_VIOLATION",




    /*
    FILES
    */

    FILE_UPLOAD_FAILED:
        "FILE_UPLOAD_FAILED",


    INVALID_FILE_TYPE:
        "INVALID_FILE_TYPE"



});