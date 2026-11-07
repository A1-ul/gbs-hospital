'use strict';


const storageConfig = {


driver:
process.env.STORAGE_DRIVER || 'local',


local: {

path:
process.env.STORAGE_PATH ||
'storage/uploads'

},



limits: {

maxFileSize:
Number(
process.env.MAX_FILE_SIZE ||
10485760
),


allowedTypes:

[
'image/jpeg',
'image/png',
'application/pdf'
]

}



};


module.exports = Object.freeze(storageConfig);