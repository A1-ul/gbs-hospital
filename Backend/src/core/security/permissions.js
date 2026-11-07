"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

SECURITY PERMISSIONS REGISTRY

Production Hardened
CommonJS Only

LOCATION:
src/core/security/permissions.js

====================================================
*/


const PERMISSIONS =
Object.freeze({



    /*
    ================================================
    SYSTEM
    ================================================
    */


    SYSTEM_ADMIN:
        "system.admin",


    SYSTEM_SETTINGS:
        "system.settings",






    /*
    ================================================
    HOSPITAL MANAGEMENT
    ================================================
    */


    HOSPITAL_CREATE:
        "hospital.create",


    HOSPITAL_READ:
        "hospital.read",


    HOSPITAL_UPDATE:
        "hospital.update",


    HOSPITAL_DELETE:
        "hospital.delete",






    /*
    ================================================
    PATIENT MANAGEMENT
    ================================================
    */


    PATIENT_CREATE:
        "patient.create",


    PATIENT_READ:
        "patient.read",


    PATIENT_UPDATE:
        "patient.update",


    PATIENT_DELETE:
        "patient.delete",






    /*
    ================================================
    MEDICAL RECORDS
    ================================================
    */


    MEDICAL_RECORD_CREATE:
        "medical_record.create",


    MEDICAL_RECORD_READ:
        "medical_record.read",


    MEDICAL_RECORD_UPDATE:
        "medical_record.update",


    MEDICAL_RECORD_DELETE:
        "medical_record.delete",






    /*
    ================================================
    STAFF
    ================================================
    */


    STAFF_CREATE:
        "staff.create",


    STAFF_READ:
        "staff.read",


    STAFF_UPDATE:
        "staff.update",


    STAFF_DELETE:
        "staff.delete",






    /*
    ================================================
    APPOINTMENTS
    ================================================
    */


    APPOINTMENT_CREATE:
        "appointment.create",


    APPOINTMENT_READ:
        "appointment.read",


    APPOINTMENT_UPDATE:
        "appointment.update",


    APPOINTMENT_CANCEL:
        "appointment.cancel",






    /*
    ================================================
    BILLING
    ================================================
    */


    BILLING_CREATE:
        "billing.create",


    BILLING_READ:
        "billing.read",


    BILLING_UPDATE:
        "billing.update",


    BILLING_REFUND:
        "billing.refund",






    /*
    ================================================
    PHARMACY
    ================================================
    */


    MEDICATION_CREATE:
        "medication.create",


    MEDICATION_READ:
        "medication.read",


    MEDICATION_UPDATE:
        "medication.update",


    MEDICATION_DELETE:
        "medication.delete",






    /*
    ================================================
    REPORTING
    ================================================
    */


    REPORT_VIEW:
        "report.view",


    REPORT_EXPORT:
        "report.export",






    /*
    ================================================
    AUDIT
    ================================================
    */


    AUDIT_READ:
        "audit.read",


    AUDIT_EXPORT:
        "audit.export"



});








function hasPermission(

    userPermissions,

    permission

){



    if(
        !Array.isArray(userPermissions)
    ){

        return false;

    }



    return userPermissions.includes(
        permission
    );

}








function validatePermission(permission){


    return Object
        .values(PERMISSIONS)
        .includes(permission);


}

module.exports = {


    PERMISSIONS,


    hasPermission,


    validatePermission


};