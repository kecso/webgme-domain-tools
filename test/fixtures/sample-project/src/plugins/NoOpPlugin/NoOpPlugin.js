/*globals define*/
/*eslint-env node, browser*/

(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["plugin/PluginConfig", "plugin/PluginBase", "text!./metadata.json"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../../../PluginConfig"),
      require("../../../PluginBase"),
      require("./metadata.json"),
    );
  }
})(function (PluginConfig, PluginBase, pluginMetadata) {
  "use strict";

  pluginMetadata = typeof pluginMetadata === "string" ? JSON.parse(pluginMetadata) : pluginMetadata;

  function NoOpPlugin() {
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  }

  NoOpPlugin.metadata = pluginMetadata;
  NoOpPlugin.prototype = Object.create(PluginBase.prototype);
  NoOpPlugin.prototype.constructor = NoOpPlugin;

  NoOpPlugin.prototype.main = function (callback) {
    this.result.setSuccess(true);
    callback(null, this.result);
  };

  return NoOpPlugin;
});
