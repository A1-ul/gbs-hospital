"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

FULL API ROUTING TESTER

PRODUCTION HARDENED

CommonJS ONLY

PART 1/2
====================================================
*/

const http = require("http");

const HOST =
process.env.TEST_HOST || "localhost";

const PORT =
Number(process.env.TEST_PORT || 5000);

const BASE =
process.env.TEST_BASE || "/api/v1";

const TEST_MODE =
process.env.NODE_ENV === "test";

const ROLLBACK_MODE =
process.env.ROLLBACK_TEST === "true";


let createdHospitalId = null;



/*
====================================================
ENVIRONMENT CHECK
====================================================
*/

function verifyEnvironment(){

    if(!TEST_MODE){

        throw new Error(
            "Blocked: NODE_ENV must be test"
        );

    }

}



/*
====================================================
HTTP ENGINE
====================================================
*/

function request(
    method,
    path,
    body=null,
    token=null
){

    return new Promise(
    (resolve,reject)=>{

        const options={

            hostname:HOST,
            port:PORT,
            path:BASE + path,
            method,

            timeout:10000,

            headers:{
                "Content-Type":
                "application/json",

                "Accept":
                "application/json"
            }

        };


        if(token){

            options.headers.Authorization =
            `Bearer ${token}`;

        }



        const req =
        http.request(
        options,
        res=>{

            let data="";


            res.on(
            "data",
            chunk=>{
                data+=chunk;
            });


            res.on(
            "end",
            ()=>{

                let parsed=data;

                try{

                    parsed =
                    JSON.parse(data);

                }
                catch{}


                resolve({

                    status:
                    res.statusCode,

                    body:
                    parsed

                });


            });


        });



        req.on(
        "timeout",
        ()=>{

            req.destroy();

            reject(
                new Error(
                    "Request timeout"
                )
            );

        });



        req.on(
        "error",
        reject
        );



        if(body){

            req.write(
                JSON.stringify(body)
            );

        }


        req.end();


    });


}



/*
====================================================
ASSERTIONS
====================================================
*/

function assertStatus(
result,
expected,
name
){

    if(result.status !== expected){

        throw new Error(
            `${name}: expected ${expected}, received ${result.status}`
        );

    }

}



function print(
name,
result
){

    console.log(
        `\n${name}: ${result.status}`
    );


    if(
    result.body?.success !== undefined
    ){

        console.log(
            "SUCCESS:",
            result.body.success
        );

    }


    if(
    result.body?.error
    ){

        console.log(
            "ERROR:",
            result.body.error.message
        );

    }


    if(
    result.body?.data
    ){

        console.log(
            "DATA RECEIVED"
        );

    }

}



/*
====================================================
AUTH TEST
====================================================
*/

async function loginTest(){

    const result =
    await request(

        "POST",

        "/auth/login",

        {

            email:
            "admin@gbs.com",

            password:
            "password"

        }

    );


    print(
        "LOGIN",
        result
    );


    assertStatus(
        result,
        200,
        "LOGIN"
    );


    const token =
    result.body?.data?.token;


    if(!token){

        throw new Error(
            "JWT missing"
        );

    }


    return token;

}



/*
====================================================
CREATE TEST DATA
====================================================
*/

function generateTestId(){

    return (
        Date.now()
        +
        "_"
        +
        Math.floor(
            Math.random()*10000
        )
    );

}



/*
====================================================
CREATE HOSPITAL
====================================================
*/

async function createHospitalTest(
token
){

    const id =
    generateTestId();


    const payload={

        code:
        `TEST_${id}`,

        name:
        `GBS TEST HOSPITAL ${id}`,

        address:
        "AUTOMATED TEST ADDRESS"

    };


    const result =
    await request(

        "POST",

        "/hospital",

        payload,

        token

    );


    print(
        "CREATE HOSPITAL",
        result
    );


    assertStatus(
        result,
        201,
        "CREATE HOSPITAL"
    );


    const hospital =
    result.body?.data;


    if(!hospital?.id){

        throw new Error(
            "Hospital ID missing"
        );

    }


    createdHospitalId =
    hospital.id;


    return hospital;

}



/*
====================================================
PART 2/2 CONTINUES

- READ VERIFY
- SEARCH
- FILTER
- SORT
- UPDATE
- DELETE
- DELETE VERIFY
- ROLLBACK ENGINE
- FINAL REPORT
- EXPORTS

====================================================
*/

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

FULL API ROUTING TESTER

PART 2/2

====================================================
*/


/*
====================================================
READ HOSPITAL VERIFY
====================================================
*/

async function readHospitalTest(
token
){

    const result =
    await request(

        "GET",

        `/hospital/${createdHospitalId}`,

        null,

        token

    );


    print(
        "READ CREATED HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "READ HOSPITAL"
    );


    return result.body.data;

}



/*
====================================================
SEARCH TEST
====================================================
*/

async function searchHospitalTest(
token
){

    const result =
    await request(

        "GET",

        "/hospital?search=GBS",

        null,

        token

    );


    print(
        "SEARCH HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "SEARCH HOSPITAL"
    );

}



/*
====================================================
FILTER TEST
====================================================
*/

async function filterHospitalTest(
token
){

    const result =
    await request(

        "GET",

        "/hospital?active=true",

        null,

        token

    );


    print(
        "FILTER ACTIVE HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "FILTER HOSPITAL"
    );

}



/*
====================================================
SORT TEST
====================================================
*/

async function sortHospitalTest(
token
){

    const result =
    await request(

        "GET",

        "/hospital?sort=createdAt&order=desc",

        null,

        token

    );


    print(
        "SORT HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "SORT HOSPITAL"
    );

}



/*
====================================================
UPDATE HOSPITAL
====================================================
*/

async function updateHospitalTest(
token
){

    const result =
    await request(

        "PUT",

        `/hospital/${createdHospitalId}`,

        {

            name:
            "GBS UPDATED TEST HOSPITAL"

        },

        token

    );


    print(
        "UPDATE HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "UPDATE HOSPITAL"
    );


}



/*
====================================================
DELETE HOSPITAL
====================================================
*/

async function deleteHospitalTest(
token
){

    if(!createdHospitalId){

        return;

    }


    const result =
    await request(

        "DELETE",

        `/hospital/${createdHospitalId}`,

        null,

        token

    );


    print(
        "DELETE HOSPITAL",
        result
    );


    assertStatus(
        result,
        200,
        "DELETE HOSPITAL"
    );


}



/*
====================================================
DELETE VERIFY
====================================================
*/

async function verifyDeletedHospital(
token
){

    const result =
    await request(

        "GET",

        `/hospital/${createdHospitalId}`,

        null,

        token

    );


    print(
        "VERIFY DELETED HOSPITAL",
        result
    );


    if(result.status !== 404){

        throw new Error(
            "Deleted hospital still accessible"
        );

    }


}



/*
====================================================
INVALID TOKEN
====================================================
*/

async function invalidTokenTest(){

    const result =
    await request(

        "GET",

        "/hospital",

        null,

        "invalid.token"

    );


    print(
        "INVALID TOKEN",
        result
    );


    assertStatus(
        result,
        401,
        "INVALID TOKEN"
    );

}



/*
====================================================
404 TEST
====================================================
*/

async function missingRouteTest(){

    const result =
    await request(

        "GET",

        "/route-not-found"

    );


    print(
        "404 ROUTE",
        result
    );


    assertStatus(
        result,
        404,
        "404 ROUTE"
    );

}



/*
====================================================
CLEANUP
====================================================
*/

async function cleanup(
token
){

    if(
        !ROLLBACK_MODE ||
        !createdHospitalId
    ){

        return;

    }


    console.log(
        "\nROLLBACK MODE ENABLED"
    );


    try{

        await deleteHospitalTest(
            token
        );


        console.log(
            "CLEANUP COMPLETE"
        );


    }
    catch(error){

        console.error(
            "CLEANUP FAILED:",
            error.message
        );

    }


}



/*
====================================================
MAIN RUNNER
====================================================
*/

async function run(){

    console.log(`
================================
GBS API TEST START
================================
`);


    verifyEnvironment();


    let token;


    try{


        token =
        await loginTest();


        console.log(
            "\nJWT RECEIVED"
        );



        const hospital =
        await createHospitalTest(
            token
        );



        await readHospitalTest(
            token
        );


        await searchHospitalTest(
            token
        );


        await filterHospitalTest(
            token
        );


        await sortHospitalTest(
            token
        );


        await updateHospitalTest(
            token
        );


        await invalidTokenTest();


        await missingRouteTest();


        if(ROLLBACK_MODE){

            await cleanup(
                token
            );

        }


        console.log(`
================================
GBS API TEST COMPLETED
================================

STATUS: PASS
`);


    }
    catch(error){


        console.error(`
================================
API TEST FAILED
================================

${error.message}
`);


        if(
            token &&
            ROLLBACK_MODE
        ){

            await cleanup(
                token
            );

        }


        process.exit(1);

    }


}

run();

module.exports = {

    request,

    run

};
