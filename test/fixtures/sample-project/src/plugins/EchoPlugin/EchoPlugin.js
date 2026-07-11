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

  function EchoPlugin() {
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  }

  EchoPlugin.metadata = pluginMetadata;
  EchoPlugin.prototype = Object.create(PluginBase.prototype);
  EchoPlugin.prototype.constructor = EchoPlugin;

  EchoPlugin.prototype.main = function (callback) {
    var self = this;
    var config = self.getCurrentConfig();

    self.logger.info("EchoPlugin running with message:", config.message);

    self.createMessage(self.activeNode, config.message, "info");

    if (config.shouldFail) {
      self.result.setError("Failed on purpose.");
      callback(new Error("Failed on purpose."), self.result);
      return;
    }

    function finish() {
      if (config.emitArtifact) {
        self.blobClient
          .putFile("echo.txt", config.message)
          .then(function (hash) {
            self.result.addArtifact(hash);
            self.result.setSuccess(true);
            callback(null, self.result);
          })
          .catch(function (err) {
            callback(err, self.result);
          });
        return;
      }
      self.result.setSuccess(true);
      callback(null, self.result);
    }

    if (config.addNode) {
      var node = self.core.createNode({
        parent: self.rootNode,
        base: self.core.getFCO(self.rootNode),
      });
      self.core.setAttribute(node, "name", config.message || "EchoNode");
      self.save("EchoPlugin added a node", function (err) {
        if (err) {
          callback(err, self.result);
          return;
        }
        finish();
      });
      return;
    }

    finish();
  };

  return EchoPlugin;
});
