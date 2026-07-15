/*globals define*/
/*eslint-env node, browser*/
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["./cardinality"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./cardinality"));
  } else {
    root.GenerateMetaTsBuildDescriptor = factory(root.GenerateMetaTsCardinality);
  }
})(typeof self !== "undefined" ? self : this, function (cardinalityMod) {
  "use strict";

  var cardinalityFromMinMax = cardinalityMod.cardinalityFromMinMax;
  var SYSTEM_CONCEPTS = { FCO: true, META: true };

  function isStructuredMemberRule(rule) {
    return typeof rule === "object" && rule !== null && "members" in rule;
  }

  function metaNodeName(core, node) {
    var value = core.getAttribute(node, "name");
    return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
  }

  function buildPathToNameMap(core, rootNode) {
    var metaByPath = core.getAllMetaNodes(rootNode);
    var map = {};
    var paths = Object.keys(metaByPath);
    for (var i = 0; i < paths.length; i += 1) {
      map[paths[i]] = metaNodeName(core, metaByPath[paths[i]]);
    }
    return map;
  }

  function resolveTypeRef(paths, pathToName) {
    var names = [];
    for (var i = 0; i < paths.length; i += 1) {
      var n = pathToName[paths[i]];
      if (typeof n === "string" && n.length > 0) names.push(n);
    }
    if (names.length === 0) return undefined;
    if (names.length === 1) return names[0];
    return names.slice().sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function buildMembersMap(items, minItems, maxItems, pathToName) {
    var members = {};
    var hasAny = false;
    for (var i = 0; i < items.length; i += 1) {
      var name = pathToName[items[i]];
      if (!name) continue;
      var card = cardinalityFromMinMax(minItems[i], maxItems[i]);
      if (!card) card = "*";
      members[name] = card;
      hasAny = true;
    }
    return hasAny ? members : undefined;
  }

  function sortMembersMap(members) {
    var keys = Object.keys(members).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var sorted = {};
    for (var i = 0; i < keys.length; i += 1) {
      sorted[keys[i]] = members[keys[i]];
    }
    return sorted;
  }

  function buildMemberRule(block, pathToName) {
    var items = block.items || [];
    if (items.length === 0) return undefined;

    var members = buildMembersMap(items, block.minItems || [], block.maxItems || [], pathToName);
    if (!members) return undefined;

    var sorted = sortMembersMap(members);
    var global = cardinalityFromMinMax(block.min, block.max);
    if (global) {
      return { global: global, members: sorted };
    }
    return sorted;
  }

  function mapAttributeDef(raw) {
    var type = raw.type;
    if (!type) return undefined;
    if (type === "boolean") return "bool";
    if (type === "string" && Array.isArray(raw.enum) && raw.enum.length > 0) {
      return { type: "enum", values: raw.enum.slice() };
    }
    if (type === "string") return "string";
    if (type === "integer") return "integer";
    if (type === "float") return "float";
    if (type === "asset") return "asset";
    return type;
  }

  function mapAttributes(meta) {
    var raw = meta.attributes;
    if (!raw) return undefined;

    var attributes = {};
    var names = Object.keys(raw);
    var hasAny = false;
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      if (name === "name") continue;
      var mapped = mapAttributeDef(raw[name]);
      if (mapped) {
        attributes[name] = mapped;
        hasAny = true;
      }
    }
    return hasAny ? attributes : undefined;
  }

  function mapPointers(meta, pathToName) {
    var raw = meta.pointers;
    var pointers = {};
    var sets = {};
    if (!raw) return { pointers: pointers, sets: sets };

    var names = Object.keys(raw);
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      var rule = raw[name];
      var max = rule.max !== undefined ? rule.max : -1;
      if (max === 1) {
        var target = resolveTypeRef(rule.items || [], pathToName);
        if (target) pointers[name] = target;
      } else {
        var memberRule = buildMemberRule(rule, pathToName);
        if (memberRule) sets[name] = memberRule;
      }
    }

    return { pointers: pointers, sets: sets };
  }

  function buildDescriptorFromCore(core, rootNode) {
    var pathToName = buildPathToNameMap(core, rootNode);
    var metaByPath = core.getAllMetaNodes(rootNode);
    var concepts = {};
    var paths = Object.keys(metaByPath);

    for (var i = 0; i < paths.length; i += 1) {
      var nodePath = paths[i];
      var metaNode = metaByPath[nodePath];
      var name = pathToName[nodePath];
      if (!name || SYSTEM_CONCEPTS[name]) continue;

      var body = {};
      var base = core.getBase(metaNode);
      if (base) {
        var baseName = metaNodeName(core, base);
        if (baseName !== "FCO") body.extends = baseName;
      }

      var meta = core.getJsonMeta(metaNode);
      var attributes = mapAttributes(meta);
      if (attributes) body.attributes = attributes;

      var children = buildMemberRule(meta.children || {}, pathToName);
      if (children) body.contains = children;

      var mapped = mapPointers(meta, pathToName);
      if (Object.keys(mapped.pointers).length > 0) body.pointers = mapped.pointers;
      if (Object.keys(mapped.sets).length > 0) body.sets = mapped.sets;

      concepts[name] = body;
    }

    return { version: 1, concepts: concepts };
  }

  function getMemberMap(rule) {
    return isStructuredMemberRule(rule) ? rule.members : rule;
  }

  function getMemberGlobal(rule) {
    return isStructuredMemberRule(rule) ? rule.global : undefined;
  }

  return {
    buildDescriptorFromCore: buildDescriptorFromCore,
    getMemberMap: getMemberMap,
    getMemberGlobal: getMemberGlobal,
    isStructuredMemberRule: isStructuredMemberRule,
  };
});
