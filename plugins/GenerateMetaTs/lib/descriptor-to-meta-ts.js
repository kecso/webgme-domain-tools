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

  function attributeValueType(def) {
    if (typeof def === "string") {
      switch (def) {
        case "bool":
          return "boolean";
        case "integer":
        case "float":
          return "number";
        case "string":
        case "asset":
          return "string";
        default:
          return "unknown";
      }
    }
    if (def.type === "enum" && Array.isArray(def.values) && def.values.length > 0) {
      return def.values
        .map(function (v) {
          return JSON.stringify(v);
        })
        .join(" | ");
    }
    if (def.type === "boolean" || def.type === "bool") return "boolean";
    if (def.type === "integer" || def.type === "float") return "number";
    if (def.type === "string" || def.type === "asset") return "string";
    return "unknown";
  }

  /** Pointer target: instance type or name string for loose authoring. */
  function pointerFieldType(ref) {
    if (typeof ref === "string") return ref + " | string";
    return ref.join(" | ") + " | string";
  }

  function setMemberType(rule) {
    var members = getMemberMap(rule);
    var names = Object.keys(members).sort(function (a, b) {
      return a.localeCompare(b);
    });
    if (names.length === 0) return "string";
    return names.join(" | ") + " | string";
  }

  function renderScopedBlock(scopeName, fieldLines) {
    if (fieldLines.length === 0) return null;
    var lines = ["  " + scopeName + "?: {"];
    for (var i = 0; i < fieldLines.length; i += 1) {
      lines.push("    " + fieldLines[i]);
    }
    lines.push("  };");
    return lines.join("\n");
  }

  /**
   * Domain instance interfaces with WebGME scopes kept separate:
   * attributes / pointers / sets / children (unnamed containment list).
   */
  function renderConceptInterface(name, body) {
    var lines = [];
    var extendsClause = body.extends ? " extends " + body.extends : "";
    lines.push("export interface " + name + extendsClause + " {");

    var attrFields = ["name?: string;"];
    var attrs = body.attributes || {};
    Object.keys(attrs)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .forEach(function (attrName) {
        attrFields.push(
          quoteProp(attrName) + "?: " + attributeValueType(attrs[attrName]) + ";",
        );
      });
    lines.push(renderScopedBlock("attributes", attrFields));

    var ptrFields = [];
    var pointers = body.pointers || {};
    Object.keys(pointers)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .forEach(function (ptrName) {
        ptrFields.push(
          quoteProp(ptrName) + "?: " + pointerFieldType(pointers[ptrName]) + ";",
        );
      });
    var ptrBlock = renderScopedBlock("pointers", ptrFields);
    if (ptrBlock) lines.push(ptrBlock);

    var setFields = [];
    var sets = body.sets || {};
    Object.keys(sets)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .forEach(function (setName) {
        setFields.push(
          quoteProp(setName) + "?: Array<" + setMemberType(sets[setName]) + ">;",
        );
      });
    var setBlock = renderScopedBlock("sets", setFields);
    if (setBlock) lines.push(setBlock);

    if (body.contains) {
      var members = getMemberMap(body.contains);
      var childTypes = Object.keys(members).sort(function (a, b) {
        return a.localeCompare(b);
      });
      if (childTypes.length > 0) {
        lines.push("  children?: Array<" + childTypes.join(" | ") + ">;");
      }
    }

    lines.push("}");
    return lines.filter(Boolean).join("\n");
  }

  function topologicalConceptOrder(concepts) {
    var names = Object.keys(concepts);
    var remaining = {};
    names.forEach(function (n) {
      remaining[n] = true;
    });
    var ordered = [];
    var guard = names.length + 1;
    while (ordered.length < names.length && guard > 0) {
      guard -= 1;
      var progressed = false;
      names.forEach(function (n) {
        if (!remaining[n]) return;
        var base = concepts[n].extends;
        if (!base || !remaining[base]) {
          ordered.push(n);
          delete remaining[n];
          progressed = true;
        }
      });
      if (!progressed) {
        Object.keys(remaining)
          .sort(function (a, b) {
            return a.localeCompare(b);
          })
          .forEach(function (n) {
            ordered.push(n);
            delete remaining[n];
          });
      }
    }
    return ordered;
  }

  function renderDeclarations(descriptor) {
    var concepts = descriptor.concepts;
    var conceptNames = Object.keys(concepts).sort(function (a, b) {
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

    var order = topologicalConceptOrder(concepts);
    var blocks = [];

    if (conceptNames.length === 0) {
      blocks.push("export type DomainConcept = never;", "");
    } else {
      blocks.push("export type DomainConcept =");
      for (i = 0; i < conceptNames.length; i += 1) {
        blocks.push(
          "  | " +
            JSON.stringify(conceptNames[i]) +
            (i === conceptNames.length - 1 ? ";" : ""),
        );
      }
      blocks.push("");
    }

    for (i = 0; i < order.length; i += 1) {
      var name = order[i];
      blocks.push(renderConceptInterface(name, concepts[name]), "");
    }

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
      " * Domain instance types. WebGME scopes are kept separate so the same\n" +
      " * name can exist as an attribute and as a pointer without clashing:\n" +
      " *   node.attributes.name  vs  node.pointers.name\n" +
      " * Containment is a single `children` array (unnamed in WebGME), not\n" +
      " * per-type slots like `states` / `actions`.\n" +
      " *\n" +
      " * Example:\n" +
      " *   const door: Machine = {\n" +
      " *     attributes: { description: \"Door lock\" },\n" +
      " *     children: [\n" +
      " *       { attributes: { name: \"Locked\", isInitial: true } },\n" +
      " *       { attributes: { name: \"Unlocked\", isFinal: true } },\n" +
      " *     ],\n" +
      " *   };\n" +
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
