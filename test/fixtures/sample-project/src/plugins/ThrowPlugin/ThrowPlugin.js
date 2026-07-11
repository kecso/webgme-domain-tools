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

  function ThrowPlugin() {
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  }

  ThrowPlugin.metadata = pluginMetadata;
  ThrowPlugin.prototype = Object.create(PluginBase.prototype);
  ThrowPlugin.prototype.constructor = ThrowPlugin;

  ThrowPlugin.prototype.main = function (callback) {
    this.result.setError("ThrowPlugin failed on purpose.");
    callback(new Error("ThrowPlugin failed on purpose."), this.result);
  };

  return ThrowPlugin;
});
