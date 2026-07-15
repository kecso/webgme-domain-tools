/*globals define*/
/*eslint-env node, browser*/

(function (factory) {
  if (typeof define === "function" && define.amd) {
    define([
      "plugin/PluginConfig",
      "plugin/PluginBase",
      "text!./metadata.json",
      "./lib/build-descriptor",
      "./lib/descriptor-to-meta-ts",
    ], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../../../PluginConfig"),
      require("../../../PluginBase"),
      require("./metadata.json"),
      require("./lib/build-descriptor"),
      require("./lib/descriptor-to-meta-ts"),
    );
  }
})(function (PluginConfig, PluginBase, pluginMetadata, buildDescriptor, metaTs) {
  "use strict";

  pluginMetadata = typeof pluginMetadata === "string" ? JSON.parse(pluginMetadata) : pluginMetadata;

  function GenerateMetaTs() {
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  }

  GenerateMetaTs.metadata = pluginMetadata;
  GenerateMetaTs.prototype = Object.create(PluginBase.prototype);
  GenerateMetaTs.prototype.constructor = GenerateMetaTs;

  GenerateMetaTs.prototype.main = function (callback) {
    var self = this;
    var config = self.getCurrentConfig();
    var fileName =
      typeof config.fileName === "string" && config.fileName.length > 0
        ? config.fileName
        : "meta.ts";
    var namespace =
      typeof config.namespace === "string" && config.namespace.length > 0
        ? config.namespace
        : undefined;
    var seedName =
      typeof config.seedName === "string" && config.seedName.length > 0
        ? config.seedName
        : self.projectName || "model";

    var source;
    try {
      var descriptor = buildDescriptor.buildDescriptorFromCore(self.core, self.rootNode);
      source = metaTs.descriptorToMetaTs(descriptor, {
        seedName: seedName,
        namespace: namespace,
      });
    } catch (err) {
      self.result.setError(err instanceof Error ? err.message : String(err));
      callback(err instanceof Error ? err : new Error(String(err)), self.result);
      return;
    }

    self.logger.info("GenerateMetaTs emitting", fileName, "for", seedName);

    self.blobClient
      .putFile(fileName, source)
      .then(function (hash) {
        self.result.addArtifact(hash);
        self.createMessage(
          self.activeNode,
          "Generated TypeScript meta types as artifact " + fileName,
          "info",
        );
        self.result.setSuccess(true);
        callback(null, self.result);
      })
      .catch(function (err) {
        callback(err, self.result);
      });
  };

  return GenerateMetaTs;
});
