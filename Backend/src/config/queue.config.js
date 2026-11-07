'use strict';


const queueConfig = {


enabled:
process.env.QUEUE_ENABLED !== 'false',


driver:
process.env.QUEUE_DRIVER || 'database',


workers:
Number(
process.env.QUEUE_WORKERS || 5
),


retry:

{

attempts:
Number(
process.env.QUEUE_RETRY || 3
),


delay:
Number(
process.env.QUEUE_DELAY || 5000
)

}



};


module.exports = Object.freeze(queueConfig);