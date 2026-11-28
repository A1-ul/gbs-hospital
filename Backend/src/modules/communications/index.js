"use strict";

module.exports = {
    routes: require("./communications.routes"),
    controller: require("./communications.controller"),
    service: require("./communications.service"),
    webrtcHub: require("./webrtc-signaling.hub")
};
