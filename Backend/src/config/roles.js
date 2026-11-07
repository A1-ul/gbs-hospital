'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

ROLE CONFIGURATION

Production Hardened
CommonJS Only

Location:
backend/src/config/roles.js

====================================================
*/



const ROLES =
    Object.freeze({
        DEVELOPER: 'DEVELOPER',
        SUPER_ADMIN: 'SUPER_ADMIN',
        ADMINISTRATOR: 'ADMINISTRATOR',
        HOSPITAL_DIRECTOR: 'HOSPITAL_DIRECTOR',
        DOCTOR: 'DOCTOR',
        SURGEON: 'SURGEON',
        DENTIST: 'DENTIST',
        EYE_DOCTOR: 'EYE_DOCTOR',
        RADIOLOGIST: 'RADIOLOGIST',
        NURSE: 'NURSE',
        PHARMACIST: 'PHARMACIST',
        LAB_TECHNICIAN: 'LAB_TECHNICIAN',
        RECEPTIONIST: 'RECEPTIONIST',
        FOLDER_RETRIEVER: 'FOLDER_RETRIEVER',
        ACCOUNTANT: 'ACCOUNTANT',
        HR_MANAGER: 'HR_MANAGER',
        PATIENT: 'PATIENT'
    });

const DEVELOPER_ROLES =
    Object.freeze([
        ROLES.DEVELOPER
    ]);

const ADMIN_ROLES =
    Object.freeze([
        ROLES.DEVELOPER,
        ROLES.SUPER_ADMIN,
        ROLES.ADMINISTRATOR,
        ROLES.HOSPITAL_DIRECTOR
    ]);

const CLINICAL_ROLES =
    Object.freeze([
        ROLES.DOCTOR,
        ROLES.SURGEON,
        ROLES.DENTIST,
        ROLES.EYE_DOCTOR,
        ROLES.RADIOLOGIST,
        ROLES.NURSE,
        ROLES.PHARMACIST,
        ROLES.LAB_TECHNICIAN
    ]);

const STAFF_ROLES =
    Object.freeze([
        ...ADMIN_ROLES,
        ...CLINICAL_ROLES,
        ROLES.RECEPTIONIST,
        ROLES.FOLDER_RETRIEVER,
        ROLES.ACCOUNTANT,
        ROLES.HR_MANAGER
    ]);

const ALL_ROLES =
    Object.freeze([
        ...STAFF_ROLES,
        ROLES.PATIENT
    ]);








function normalizeRole(role){


    if(
        typeof role !== 'string'
    ){

        return null;

    }


    return role
        .trim()
        .toUpperCase();


}









function isValidRole(role){


    const normalized =
        normalizeRole(role);



    return Boolean(

        normalized &&

        ALL_ROLES.includes(
            normalized
        )

    );


}








function hasAdminAccess(role){


    const normalized =
        normalizeRole(role);



    return Boolean(

        normalized &&

        ADMIN_ROLES.includes(
            normalized
        )

    );


}








function hasClinicalAccess(role){


    const normalized =
        normalizeRole(role);



    return Boolean(

        normalized &&

        CLINICAL_ROLES.includes(
            normalized
        )

    );


}








function hasStaffAccess(role){


    const normalized =
        normalizeRole(role);



    return Boolean(

        normalized &&

        STAFF_ROLES.includes(
            normalized
        )

    );


}








function hasDeveloperAccess(role){
    const normalized = normalizeRole(role);
    return Boolean(normalized && DEVELOPER_ROLES.includes(normalized));
}

module.exports =
Object.freeze({
    ROLES,
    DEVELOPER_ROLES,
    ADMIN_ROLES,
    CLINICAL_ROLES,
    STAFF_ROLES,
    ALL_ROLES,
    normalizeRole,
    isValidRole,
    hasDeveloperAccess,
    hasAdminAccess,
    hasClinicalAccess,
    hasStaffAccess
});