const prisma = require("../database/prisma.client");


const logger = require("./logger");



function shutdown(server){


const closeServer = async(signal)=>{


try{


logger.info(
`${signal} received. Closing server...`
);



server.close(async()=>{


await prisma.$disconnect();



logger.info(
"Database disconnected"
);



process.exit(0);



});



setTimeout(()=>{


logger.error(
"Forced shutdown"
);



process.exit(1);



},10000);



}


catch(error){


logger.error(
"Shutdown error",
error
);


process.exit(1);


}



};



process.on(
"SIGTERM",
()=>closeServer(server)
);


process.on(
"SIGINT",
()=>closeServer(server)
);



}



module.exports = shutdown;