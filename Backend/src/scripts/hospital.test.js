"use strict";

/*
====================================================

GBS HOSPITAL MANAGEMENT SYSTEM

HOSPITAL CONFIGURATION API TEST

PHASE 2
PART 1
STEP 1.6

PRODUCTION INTEGRATION TEST

COMMONJS ONLY

====================================================
*/


const http = require("http");



const BASE_URL =
process.env.API_URL ||
"http://localhost:5000/api/v1";



let token = null;

let hospitalId = null;





function request(
method,
path,
body = null,
auth = true
){

return new Promise((resolve,reject)=>{


const url = new URL(
`${BASE_URL}${path}`
);



const options = {

hostname:url.hostname,

port:url.port,

path:url.pathname,

method,

headers:{
"Content-Type":"application/json"
}

};



if(auth && token){

options.headers.Authorization =
`Bearer ${token}`;

}



const req = http.request(
options,
(res)=>{


let data="";


res.on(
"data",
chunk=>{
data += chunk;
}
);



res.on(
"end",
()=>{


let parsed;


try{

parsed = JSON.parse(data);

}
catch{

parsed=data;

}



resolve({

status:res.statusCode,

body:parsed

});


});


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





async function login(){


console.log("\n=== LOGIN TEST ===");



const response =
await request(

"POST",

"/auth/login",

{

email:
process.env.TEST_EMAIL ||
"admin@gbs.com",


password:
process.env.TEST_PASSWORD ||
"password"

},

false

);



console.log(response.status);



if(response.status !== 200){

throw new Error(
"Login failed"
);

}



token =
response.body.data.token;



console.log(
"JWT RECEIVED"
);


}





async function createHospital(){


console.log(
"\n=== CREATE HOSPITAL ==="
);



const unique =
Date.now();



const response =
await request(

"POST",

"/hospital",

{

name:
`GBS Test Hospital ${unique}`,

code:
`GBS${unique}`,

registrationNumber:
`REG-${unique}`,

email:
`test${unique}@gbs-hospital.com`,

phone:
"+123456789",

country:
"Kenya",

city:
"Nairobi",

timezone:
"Africa/Nairobi"

}

);



console.log(response);



if(response.status !== 201){

throw new Error(
"Hospital creation failed"
);

}



hospitalId =
response.body.data.id;



console.log(
"Hospital ID:",
hospitalId
);


}





async function getHospital(){


console.log(
"\n=== GET HOSPITAL ==="
);



const response =
await request(

"GET",

`/hospital/${hospitalId}`

);



console.log(response);



if(response.status !== 200){

throw new Error(
"Get hospital failed"
);

}


}





async function updateHospital(){


console.log(
"\n=== UPDATE HOSPITAL ==="
);



const response =
await request(

"PUT",

`/hospital/${hospitalId}`,

{

phone:
"+999999999",

website:
"https://gbs-hospital.com"

}

);



console.log(response);



if(response.status !== 200){

throw new Error(
"Hospital update failed"
);

}


}






async function createBranch(){


console.log(
"\n=== CREATE BRANCH ==="
);



const unique =
Date.now();



const response =
await request(

"POST",

`/hospital/${hospitalId}/branches`,

{

name:
`Main Branch ${unique}`,

code:
`MAIN${unique}`,

city:
"Nairobi",

country:
"Kenya"

}

);



console.log(response);



if(response.status !== 201){

throw new Error(
"Branch creation failed"
);

}


}






async function createSettings(){


console.log(
"\n=== CREATE SETTINGS ==="
);



const response =
await request(

"POST",

`/hospital/${hospitalId}/settings`,

{

key:
`currency_${Date.now()}`,

value:
"USD"

}

);



console.log(response);



if(response.status !== 201){

throw new Error(
"Settings creation failed"
);

}


}






async function securityTest(){


console.log(
"\n=== SECURITY TEST ==="
);



const savedToken =
token;



token=null;



const response =
await request(

"POST",

"/hospital",

{

name:
"Unauthorized Hospital",

code:
`NOAUTH${Date.now()}`

},

true

);



token=savedToken;



console.log(response);



if(response.status !== 401){

throw new Error(
"Authentication protection failed"
);

}


}







async function run(){


try{


console.log(
"\n================================"
);

console.log(
"GBS HOSPITAL API TEST"
);

console.log(
"================================"
);



await login();

await createHospital();

await getHospital();

await updateHospital();

await createBranch();

await createSettings();

await securityTest();



console.log(
"\n================================"
);

console.log(
"PHASE 2 PART 1 STEP 1.6 PASSED"
);

console.log(
"Hospital Configuration API Verified"
);

console.log(
"================================"
);



process.exit(0);



}
catch(error){


console.error(
"\nTEST FAILED"
);


console.error(
error.message
);


process.exit(1);


}


}



run();