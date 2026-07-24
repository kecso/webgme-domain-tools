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

  function localName(fqn) {
    var i = fqn.lastIndexOf(".");
    return i < 0 ? fqn : fqn.slice(i + 1);
  }

  function namespaceOf(fqn) {
    var i = fqn.lastIndexOf(".");
    return i < 0 ? "" : fqn.slice(0, i);
  }

  function assertValidFqn(fqn) {
    var parts = fqn.split(".");
    for (var i = 0; i < parts.length; i += 1) {
      if (!isValidTsIdentifier(parts[i])) {
        throw new Error(
          'Concept name "' +
            fqn +
            '" is not a valid TypeScript identifier path; rename in the metamodel or extend the generator',
        );
      }
    }
  }

  function extendsClauseFor(fqn, baseFqn) {
    if (!baseFqn) return "";
    if (namespaceOf(fqn) && namespaceOf(fqn) === namespaceOf(baseFqn)) {
      return " extends " + localName(baseFqn);
    }
    return " extends " + baseFqn;
  }

  /**
   * Domain instance interfaces with WebGME scopes kept separate:
   * attributes / pointers / sets / children (unnamed containment list).
   * `fqn` may be `Lib.Concept` — interface is emitted as local name inside a namespace.
   */
  function renderConceptInterface(fqn, body) {
    var lines = [];
    var name = localName(fqn);
    lines.push("export interface " + name + extendsClauseFor(fqn, body.extends) + " {");

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

  function topologicalConceptOrder(concepts, names) {
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
      assertValidFqn(conceptNames[i]);
    }

    var byNs = {};
    var hostNames = [];
    var nsNames = [];
    for (i = 0; i < conceptNames.length; i += 1) {
      var fqn = conceptNames[i];
      var ns = namespaceOf(fqn);
      if (!ns) {
        hostNames.push(fqn);
      } else {
        if (!byNs[ns]) {
          byNs[ns] = [];
          nsNames.push(ns);
        }
        byNs[ns].push(fqn);
      }
    }
    nsNames.sort(function (a, b) {
      return a.localeCompare(b);
    });

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

    // Library namespaces first so host interfaces can extend Lib.Concept.
    for (i = 0; i < nsNames.length; i += 1) {
      var libNs = nsNames[i];
      var libConcepts = byNs[libNs];
      var libOrder = topologicalConceptOrder(concepts, libConcepts);
      var nsParts = libNs.split(".");
      for (var p = 0; p < nsParts.length; p += 1) {
        assertValidFqn(nsParts[p]);
      }
      var inner = [];
      for (var j = 0; j < libOrder.length; j += 1) {
        inner.push(renderConceptInterface(libOrder[j], concepts[libOrder[j]]), "");
      }
      var nested = inner.join("\n").replace(/\n+$/, "");
      // Support multi-segment namespaces (A.B) via nested export namespace.
      var open = "";
      var close = "";
      var indent = 0;
      for (p = 0; p < nsParts.length; p += 1) {
        open +=
          (p === 0 ? "" : "\n") +
          indentBlock("export namespace " + nsParts[p] + " {", indent);
        close = indentBlock("}", indent) + (close ? "\n" + close : "");
        indent += 2;
      }
      blocks.push(open + "\n" + indentBlock(nested, indent) + "\n" + close, "");
    }

    var hostOrder = topologicalConceptOrder(concepts, hostNames);
    for (i = 0; i < hostOrder.length; i += 1) {
      var hostName = hostOrder[i];
      blocks.push(renderConceptInterface(hostName, concepts[hostName]), "");
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
