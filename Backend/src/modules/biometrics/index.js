"use strict";

module.exports = {
  routes: require("./routes/biometric-vault.routes"),
  controller: require("./controllers/biometric-vault.controller"),
  service: require("./services/biometric-vault.service"),
  engine: require("./helpers/voice-biometrics.engine"),
  idGenerator: require("./helpers/biometric-id.generator")
};
