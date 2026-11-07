'use strict';


const securityConfig = {


jwt: {

    secret:
      process.env.JWT_SECRET,

    expires:
      process.env.JWT_EXPIRES || '7d',


    refreshExpires:
      process.env.JWT_REFRESH_EXPIRES || '30d'

},



password: {

    saltRounds:
      Number(
        process.env.BCRYPT_ROUNDS || 12
      )

},



encryption: {

    algorithm:
      process.env.ENCRYPTION_ALGORITHM ||
      'aes-256-gcm',

    key:
      process.env.ENCRYPTION_KEY

},



session: {

    timeout:
      Number(
        process.env.SESSION_TIMEOUT || 86400000
      )

}


};


module.exports = Object.freeze(securityConfig);