"use strict";

const config = require("./gme-config.cjs");
const { validateConfig } = require("webgme-engine/config/validator");

validateConfig(config);
module.exports = config;
