/*globals define*/
/*eslint-env node, browser*/

/**
 * ImportMetaLang — create a new .webgmex from a MetaLang file (Phase 9).
 * Create-only: requires config.file and an --out path from webdot plugin run.
 */
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

  pluginMetadata =
    typeof pluginMetadata === "string" ? JSON.parse(pluginMetadata) : pluginMetadata;

  function ImportMetaLang() {
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  }

  ImportMetaLang.metadata = pluginMetadata;
  ImportMetaLang.prototype = Object.create(PluginBase.prototype);
  ImportMetaLang.prototype.constructor = ImportMetaLang;

  ImportMetaLang.prototype.main = function (callback) {
    var self = this;
    var config = self.getCurrentConfig();
    var file = typeof config.file === "string" ? config.file.trim() : "";
    if (!file) {
      var err = new Error('ImportMetaLang requires config "file" (path to .metalang)');
      self.result.setError(err.message);
      callback(err, self.result);
      return;
    }

    // Create path is implemented in webdot core (src/meta/import-metalang.ts).
    // Prefer that entry when available; plugin run with --out uses the same module.
    var path = require("path");
    var { pathToFileURL } = require("url");
    var corePath = path.join(__dirname, "..", "..", "dist", "meta", "import-metalang.js");

    import(pathToFileURL(corePath).href)
      .then(function (mod) {
        var out =
          typeof config.out === "string" && config.out.trim()
            ? config.out.trim()
            : null;
        if (!out) {
          throw new Error(
            "ImportMetaLang create-only requires --out <path.webgmex> (or config.out)",
          );
        }
        return mod.importMetaLangToWebgmex({
          file: path.isAbsolute(file) ? file : path.resolve(process.cwd(), file),
          out: path.isAbsolute(out) ? out : path.resolve(process.cwd(), out),
          templateWebgmex:
            typeof config.templateWebgmex === "string" && config.templateWebgmex.trim()
              ? config.templateWebgmex.trim()
              : undefined,
          cwd: process.cwd(),
        });
      })
      .then(function (result) {
        self.createMessage(
          self.activeNode,
          "Created " +
            result.out +
            " from metalang domain " +
            result.domain +
            (result.libraries.length ? " (libraries: " + result.libraries.join(", ") + ")" : ""),
          "info",
        );
        self.result.setSuccess(true);
        callback(null, self.result);
      })
      .catch(function (err) {
        self.result.setError(err instanceof Error ? err.message : String(err));
        callback(err instanceof Error ? err : new Error(String(err)), self.result);
      });
  };

  return ImportMetaLang;
});
