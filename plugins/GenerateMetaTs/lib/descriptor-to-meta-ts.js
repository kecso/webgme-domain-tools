/*globals define*/
/*eslint-env node, browser*/
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["./build-descriptor"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./build-descriptor"));
  } else {
    root.GenerateMetaTsEmit = factory(root.GenerateMetaTsBuildDescriptor);
  }
})(typeof self !== "undefined" ? self : this, function (buildDescriptor) {
  "use strict";

  var getMemberMap = buildDescriptor.getMemberMap;
  var getMemberGlobal = buildDescriptor.getMemberGlobal;

  function isValidTsIdentifier(name) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
  }

  function quoteProp(name) {
    return isValidTsIdentifier(name) ? name : JSON.stringify(name);
  }

  function indentBlock(source, spaces) {
    var pad = "";
    for (var i = 0; i < spaces; i += 1) pad += " ";
    return source
      .split("\n")
      .map(function (line) {
        return line.length === 0 ? line : pad + line;
      })
      .join("\n");
  }

  /** Emit a runtime attribute def as a TS const expression (descriptor shape). */
  function attributeDefExpr(def) {
    if (typeof def === "string") {
      return JSON.stringify(def);
    }
    if (def.type === "enum" && Array.isArray(def.values)) {
      return (
        '{ type: "enum", values: [' +
        def.values
          .map(function (v) {
            return JSON.stringify(v);
          })
          .join(", ") +
        "] as const }"
      );
    }
    return JSON.stringify(def);
  }

  function typeRefExpr(ref) {
    if (typeof ref === "string") return JSON.stringify(ref);
    return (
      "[" +
      ref
        .map(function (r) {
          return JSON.stringify(r);
        })
        .join(", ") +
      "] as const"
    );
  }

  function memberRuleExpr(rule) {
    var members = getMemberMap(rule);
    var global = getMemberGlobal(rule);
    var keys = Object.keys(members).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var sorted = {};
    for (var i = 0; i < keys.length; i += 1) {
      sorted[keys[i]] = members[keys[i]];
    }
    if (global) {
      return JSON.stringify({ global: global, members: sorted });
    }
    return JSON.stringify(sorted);
  }

  function recordExpr(entries, valueFn, empty) {
    var keys = Object.keys(entries || {}).sort(function (a, b) {
      return a.localeCompare(b);
    });
    if (keys.length === 0) return empty;
    var lines = ["{"];
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      lines.push("    " + quoteProp(key) + ": " + valueFn(entries[key]) + ",");
    }
    lines.push("  }");
    return lines.join("\n");
  }

  function renderConceptEntry(name, body) {
    var lines = [];
    lines.push("  " + name + ": {");
    lines.push("    name: " + JSON.stringify(name) + ",");
    if (body.extends) {
      lines.push("    extends: " + JSON.stringify(body.extends) + ",");
    }
    lines.push(
      "    attributes: " +
        recordExpr(body.attributes, attributeDefExpr, "{}") +
        " as const,",
    );
    lines.push(
      "    pointers: " + recordExpr(body.pointers, typeRefExpr, "{}") + " as const,",
    );
    if (body.contains) {
      lines.push("    contains: " + memberRuleExpr(body.contains) + " as const,");
    } else {
      lines.push("    contains: {} as const,");
    }
    lines.push(
      "    sets: " +
        recordExpr(body.sets, memberRuleExpr, "{}") +
        " as const,",
    );
    lines.push("  },");
    return lines.join("\n");
  }

  /**
   * Concept-centric Meta table. Discover attributes/pointers from Meta.State —
   * not from aggregate *ByConcept maps.
   */
  function renderDeclarations(descriptor) {
    var conceptNames = Object.keys(descriptor.concepts).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var i;
    for (i = 0; i < conceptNames.length; i += 1) {
      if (!isValidTsIdentifier(conceptNames[i])) {
        throw new Error(
          'Concept name "' +
            conceptNames[i] +
            '" is not a valid TypeScript identifier; rename in the metamodel or extend the generator',
        );
      }
    }

    var blocks = [];
    blocks.push("export const Meta = {");
    for (i = 0; i < conceptNames.length; i += 1) {
      var name = conceptNames[i];
      blocks.push(renderConceptEntry(name, descriptor.concepts[name]));
    }
    blocks.push("} as const;", "");
    blocks.push("export type MetaConcept = keyof typeof Meta;", "");
    blocks.push(
      "/** Attribute defs for one concept — pick the concept first, then its fields. */",
    );
    blocks.push(
      "export type AttrsOf<C extends MetaConcept> = (typeof Meta)[C][\"attributes\"];",
      "",
    );
    blocks.push(
      "export type PointersOf<C extends MetaConcept> = (typeof Meta)[C][\"pointers\"];",
      "",
    );
    blocks.push(
      "export type ContainsOf<C extends MetaConcept> = (typeof Meta)[C][\"contains\"];",
      "",
    );
    blocks.push(
      "export type SetsOf<C extends MetaConcept> = (typeof Meta)[C][\"sets\"];",
      "",
    );

    return blocks.join("\n").replace(/\n+$/, "") + "\n";
  }

  function descriptorToMetaTs(descriptor, options) {
    var header =
      "/**\n" +
      " * Generated by GenerateMetaTs — do not edit by hand.\n" +
      " * Seed: " +
      options.seedName +
      "\n" +
      " *\n" +
      " * Concept-centric metamodel table. Start from Meta.<Concept>, then\n" +
      " * read .attributes / .pointers / .contains / .sets on that entry.\n" +
      " */\n\n";

    var declarations = renderDeclarations(descriptor);

    if (!options.namespace) {
      return header + declarations;
    }

    if (!isValidTsIdentifier(options.namespace)) {
      throw new Error(
        'Namespace "' + options.namespace + '" is not a valid TypeScript identifier',
      );
    }

    return (
      header +
      "export namespace " +
      options.namespace +
      " {\n" +
      indentBlock(declarations.replace(/\n+$/, ""), 2) +
      "\n}\n"
    );
  }

  return { descriptorToMetaTs: descriptorToMetaTs };
});
