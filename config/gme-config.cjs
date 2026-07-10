"use strict";

const path = require("path");
const os = require("os");

const config = require("webgme-engine/config/config.default");

config.storage.database.type = "memory";
config.authentication.enable = false;
config.authentication.gmeAuth = {
  path: path.join(
    path.dirname(require.resolve("webgme-engine/package.json")),
    "src/server/middleware/auth/memorygmeauth",
  ),
};

config.blob.fsDir = path.join(os.tmpdir(), "webdot-blob");

config.server.log = {
  transports: [
    {
      transportType: "Console",
      options: {
        level: "error",
        silent: true,
        colorize: false,
        timestamp: false,
      },
    },
  ],
};

module.exports = config;
